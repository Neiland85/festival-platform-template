/**
 * Circuit Breaker for Redis — prevents cascading failures.
 *
 * States:
 *   CLOSED  → Normal operation. Failures increment counter.
 *   OPEN    → Redis considered down. All calls return null immediately.
 *             After resetTimeout, transitions to HALF_OPEN.
 *   HALF_OPEN → One probe request allowed through.
 *               Success → CLOSED. Failure → OPEN again.
 *
 * When the state changes, a structured JSON log is emitted so monitoring
 * tools (CloudWatch, Datadog, Loki) can alert on degraded mode.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

export type CircuitBreakerConfig = {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number
  /** Time in ms before attempting recovery (OPEN → HALF_OPEN) */
  resetTimeoutMs: number
  /** Max concurrent probe requests in HALF_OPEN state */
  halfOpenMaxProbes: number
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  halfOpenMaxProbes: 1,
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED"
  private failures = 0
  private lastFailureAt = 0
  private halfOpenProbes = 0
  private readonly config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Check if a request should be allowed through */
  canExecute(): boolean {
    switch (this.state) {
      case "CLOSED":
        return true

      case "OPEN": {
        const elapsed = Date.now() - this.lastFailureAt
        if (elapsed >= this.config.resetTimeoutMs) {
          this.transition("HALF_OPEN")
          return true
        }
        return false
      }

      case "HALF_OPEN":
        if (this.halfOpenProbes < this.config.halfOpenMaxProbes) {
          this.halfOpenProbes++
          return true
        }
        return false
    }
  }

  /** Record a successful operation */
  onSuccess(): void {
    if (this.state === "HALF_OPEN" || this.state === "OPEN") {
      this.transition("CLOSED")
    }
    this.failures = 0
    this.halfOpenProbes = 0
  }

  /** Record a failed operation */
  onFailure(): void {
    this.failures++
    this.lastFailureAt = Date.now()

    if (this.state === "HALF_OPEN") {
      this.transition("OPEN")
      return
    }

    if (this.failures >= this.config.failureThreshold) {
      this.transition("OPEN")
    }
  }

  /** Get current state (for health endpoints) */
  getState(): { state: CircuitState; failures: number; lastFailureAt: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureAt: this.lastFailureAt,
    }
  }

  /** Reset to initial state (for tests) */
  reset(): void {
    this.state = "CLOSED"
    this.failures = 0
    this.lastFailureAt = 0
    this.halfOpenProbes = 0
  }

  private transition(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState
    this.halfOpenProbes = 0

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        event: "circuit_breaker",
        component: "redis",
        transition: `${oldState} → ${newState}`,
        state: newState,
        failures: this.failures,
        resetTimeoutMs: this.config.resetTimeoutMs,
      }),
    )
  }
}

/** Singleton circuit breaker for Redis operations */
export const redisCircuitBreaker = new CircuitBreaker()

/**
 * Execute an async operation through the circuit breaker.
 * Returns null if the circuit is open or the operation fails.
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
): Promise<T | null> {
  if (!redisCircuitBreaker.canExecute()) {
    return null
  }

  try {
    const result = await fn()
    redisCircuitBreaker.onSuccess()
    return result
  } catch {
    redisCircuitBreaker.onFailure()
    return null
  }
}
