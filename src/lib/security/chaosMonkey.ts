/**
 * Chaos Monkey — Runtime Failure Injection
 *
 * Injects random failures into the system:
 * - Hard kills (process.exit(1))
 * - Random errors at critical points
 * - Variable latencies (network simulation)
 *
 * This separates "works in testing" from "doesn't break in production"
 *
 * Enable with: CHAOS=true
 * Configure with env vars: CHAOS_ERROR_RATE, CHAOS_LATENCY_RATE, CHAOS_KILL_RATE
 */

import { log } from "@/lib/logger"

export interface ChaosConfig {
  enabled: boolean
  errorRate: number // 0.0-1.0: probability of throwing error
  latencyRate: number // 0.0-1.0: probability of adding delay
  maxLatencyMs: number // max delay in milliseconds
  killRate: number // 0.0-1.0: probability of hard kill
  logVerbose: boolean // log every injection attempt
}

const DEFAULT_CONFIG: ChaosConfig = {
  enabled: process.env["CHAOS"] === "true",
  errorRate: parseFloat(process.env["CHAOS_ERROR_RATE"] || "0.05"),
  latencyRate: parseFloat(process.env["CHAOS_LATENCY_RATE"] || "0.1"),
  maxLatencyMs: parseInt(process.env["CHAOS_MAX_LATENCY_MS"] || "3000", 10),
  killRate: parseFloat(process.env["CHAOS_KILL_RATE"] || "0.01"),
  logVerbose: process.env["CHAOS_VERBOSE"] === "true",
}

// ── Metrics for observability ──────────────────────────────

interface ChaosMetrics {
  injectionPoints: number
  killsTriggered: number
  errorsTriggered: number
  latenciesTriggered: number
  totalLatencyMs: number
  firstKillAt?: number
}

const metrics: ChaosMetrics = {
  injectionPoints: 0,
  killsTriggered: 0,
  errorsTriggered: 0,
  latenciesTriggered: 0,
  totalLatencyMs: 0,
}

// ── Chaos Monkey Implementation ────────────────────────────

export class ChaosMonkey {
  private config: ChaosConfig
  private metrics: ChaosMetrics

  constructor(config?: Partial<ChaosConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.metrics = { ...metrics }

    if (this.config.enabled) {
      log("warn", "chaos_monkey_enabled", {
        errorRate: this.config.errorRate,
        latencyRate: this.config.latencyRate,
        killRate: this.config.killRate,
      })
    }
  }

  /**
   * Main injection point — call this before/after critical operations
   *
   * @param point - Name of injection point (e.g., "before_dequeue", "after_ack_db")
   * @param options - Optional configuration override for this specific point
   */
  async inject(
    point: string,
    options?: {
      errorRate?: number
      latencyRate?: number
      killRate?: number
    }
  ): Promise<void> {
    if (!this.config.enabled) return

    this.metrics.injectionPoints++

    // Override config for specific point if provided
    const errorRate = options?.errorRate ?? this.config.errorRate
    const latencyRate = options?.latencyRate ?? this.config.latencyRate
    const killRate = options?.killRate ?? this.config.killRate

    // 💥 HARD KILL: process.exit(1) (simulates kill -9, OOM, crash)
    if (Math.random() < killRate) {
      const timestamp = new Date().toISOString()
      this.metrics.killsTriggered++
      if (!this.metrics.firstKillAt) {
        this.metrics.firstKillAt = Date.now()
      }

      const message = `[CHAOS MONKEY 💥] HARD KILL at ${point} (${timestamp})`
      console.error(message)
      log("error", "chaos_monkey_hard_kill", {
        point,
        metricsSnapshot: this.metrics,
      })

      // Simulate kill -9 (instant termination, no cleanup)
      process.exit(1)
    }

    // ⚠️ RANDOM ERROR: throw at critical point
    if (Math.random() < errorRate) {
      this.metrics.errorsTriggered++

      const error = new Error(`[CHAOS] Injected error at ${point}`)
      if (this.config.logVerbose) {
        log("warn", "chaos_monkey_error_injected", { point })
      }

      throw error
    }

    // 🐢 VARIABLE LATENCY: simulate network/disk delays
    if (Math.random() < latencyRate) {
      const delay = Math.random() * this.config.maxLatencyMs
      this.metrics.latenciesTriggered++
      this.metrics.totalLatencyMs += delay

      if (this.config.logVerbose) {
        log("warn", "chaos_monkey_latency_injected", {
          point,
          delayMs: delay.toFixed(2),
        })
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  /**
   * Get current metrics (useful for observability during soak tests)
   */
  getMetrics(): ChaosMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics (between test runs)
   */
  resetMetrics(): void {
    this.metrics = {
      injectionPoints: 0,
      killsTriggered: 0,
      errorsTriggered: 0,
      latenciesTriggered: 0,
      totalLatencyMs: 0,
    }
  }

  /**
   * Print metrics summary
   */
  printMetrics(): string {
    const avgLatency =
      this.metrics.latenciesTriggered > 0
        ? (this.metrics.totalLatencyMs / this.metrics.latenciesTriggered).toFixed(2)
        : "0"

    return `
╔════════════════════════════════════════════╗
║     Chaos Monkey Metrics                   ║
╚════════════════════════════════════════════╝
Injection Points:    ${this.metrics.injectionPoints}
Hard Kills:         ${this.metrics.killsTriggered}
Errors Thrown:      ${this.metrics.errorsTriggered}
Latencies Injected: ${this.metrics.latenciesTriggered}
Total Latency:      ${this.metrics.totalLatencyMs.toFixed(0)}ms
Avg Latency:        ${avgLatency}ms
${this.metrics.firstKillAt ? `First Kill At:      ${new Date(this.metrics.firstKillAt).toISOString()}` : "No kills triggered yet"}
    `.trim()
  }
}

// ── Singleton Instance ─────────────────────────────────────

export const chaos = new ChaosMonkey()

// ── Helper: Chaos-aware setTimeout ────────────────────────

export async function chaosDelay(ms: number): Promise<void> {
  await chaos.inject("delay", { killRate: 0.01 }) // Inject chaos but with lower kill rate
  await new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Helper: Chaos-aware database calls ────────────────────

export async function chaosDbQuery<T>(
  queryFn: () => Promise<T>,
  point: string
): Promise<T> {
  await chaos.inject(`${point}_before`)
  const result = await queryFn()
  await chaos.inject(`${point}_after`)
  return result
}

// ── Helper: Chaos-aware Redis calls ─────────────────────

export async function chaosRedisOp<T>(
  opFn: () => Promise<T>,
  point: string
): Promise<T> {
  await chaos.inject(`${point}_before`)
  const result = await opFn()
  await chaos.inject(`${point}_after`)
  return result
}

// ── Expose metrics for monitoring ──────────────────────────

export function getChaosMetrics(): ChaosMetrics {
  return chaos.getMetrics()
}
