import { describe, it, expect, vi, beforeEach } from "vitest"
import { runAutoRetry, type HealthCheckFn } from "./dlq-auto-retry"

// ── Mock DLQ domain layer ──────────────────────────
const mockListDeadLetters = vi.fn()
const mockRetryDeadLetter = vi.fn()

vi.mock("./dead-letter-queue", () => ({
  listDeadLetters: (...args: unknown[]) => mockListDeadLetters(...args),
  retryDeadLetter: (...args: unknown[]) => mockRetryDeadLetter(...args),
}))

// ── Healthy by default ─────────────────────────────
const healthyCheck: HealthCheckFn = () => ({ utilization: 0.3 })

// ── Helpers ─────────────────────────────────────────
function dlqEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "dlq-001",
    provider: "stripe",
    eventType: "checkout.session.completed",
    eventId: "evt_test_123",
    payload: "{}",
    error: "connect ECONNREFUSED 127.0.0.1:5432",
    attempts: 1,
    resolvedAt: null,
    // 10 minutes ago — past any backoff
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
    ...overrides,
  }
}

describe("runAutoRetry v2", () => {
  beforeEach(() => {
    mockListDeadLetters.mockReset()
    mockRetryDeadLetter.mockReset()
  })

  // ── v1 behavior preserved ───────────────────────

  it("retries transient error (ECONNREFUSED)", { timeout: 20_000 }, async () => {
    mockListDeadLetters.mockResolvedValueOnce([dlqEntry()])
    mockRetryDeadLetter.mockResolvedValueOnce({ ok: true })

    const result = await runAutoRetry(healthyCheck)

    expect(result.scanned).toBe(1)
    expect(result.retried).toBe(1)
    expect(result.succeeded).toBe(1)
    expect(mockRetryDeadLetter).toHaveBeenCalledWith("dlq-001")
  })

  it("retries connection timeout", async () => {
    mockListDeadLetters.mockResolvedValueOnce([
      dlqEntry({ error: "connection timeout after 30000ms" }),
    ])
    mockRetryDeadLetter.mockResolvedValueOnce({ ok: true })

    const result = await runAutoRetry(healthyCheck)
    expect(result.retried).toBe(1)
    expect(result.succeeded).toBe(1)
  })

  it("skips non-transient error (code bug)", async () => {
    mockListDeadLetters.mockResolvedValueOnce([
      dlqEntry({ error: "Cannot read properties of undefined (reading 'id')" }),
    ])

    const result = await runAutoRetry(healthyCheck)
    expect(result.skipped).toBe(1)
    expect(mockRetryDeadLetter).not.toHaveBeenCalled()
  })

  it("skips safe error (already handled)", async () => {
    mockListDeadLetters.mockResolvedValueOnce([
      dlqEntry({ error: "Order status is not reserved" }),
    ])

    const result = await runAutoRetry(healthyCheck)
    expect(result.skipped).toBe(1)
    expect(mockRetryDeadLetter).not.toHaveBeenCalled()
  })

  it("skips entry with attempts > 2", async () => {
    mockListDeadLetters.mockResolvedValueOnce([dlqEntry({ attempts: 3 })])

    const result = await runAutoRetry(healthyCheck)
    expect(result.skipped).toBe(1)
    expect(result.entries[0]!.reason).toContain("exceeds auto-retry limit")
  })

  it("allows retry at attempts=2", async () => {
    mockListDeadLetters.mockResolvedValueOnce([dlqEntry({ attempts: 2 })])
    mockRetryDeadLetter.mockResolvedValueOnce({ ok: true })

    const result = await runAutoRetry(healthyCheck)
    expect(result.retried).toBe(1)
  })

  it("skips entry that is too new (backoff)", async () => {
    mockListDeadLetters.mockResolvedValueOnce([
      dlqEntry({ createdAt: new Date(Date.now() - 10 * 1000) }),
    ])

    const result = await runAutoRetry(healthyCheck)
    expect(result.skipped).toBe(1)
    expect(result.entries[0]!.reason).toContain("backoff")
  })

  it("records failed retry result", async () => {
    mockListDeadLetters.mockResolvedValueOnce([dlqEntry()])
    mockRetryDeadLetter.mockResolvedValueOnce({
      ok: false,
      reason: "completeOrder failed: DB still down",
      code: "domain_error",
    })

    const result = await runAutoRetry(healthyCheck)
    expect(result.failed).toBe(1)
    expect(result.entries[0]!.outcome).toBe("failed")
  })

  it("handles empty queue gracefully", async () => {
    mockListDeadLetters.mockResolvedValueOnce([])

    const result = await runAutoRetry(healthyCheck)
    expect(result.scanned).toBe(0)
    expect(result.retried).toBe(0)
  })

  // ── v2: Circuit breaker ─────────────────────────

  describe("circuit breaker", () => {
    it("skips all retries when pool utilization > 90%", async () => {
      const overloaded: HealthCheckFn = () => ({ utilization: 0.95 })

      const result = await runAutoRetry(overloaded)

      expect(result.skippedHealth).toBe(true)
      expect(result.scanned).toBe(0)
      expect(result.retried).toBe(0)
      expect(mockListDeadLetters).not.toHaveBeenCalled()
    })

    it("skips all retries when health check throws", async () => {
      const broken: HealthCheckFn = () => { throw new Error("pool not initialized") }

      const result = await runAutoRetry(broken)

      expect(result.skippedHealth).toBe(true)
      expect(result.scanned).toBe(0)
      expect(mockListDeadLetters).not.toHaveBeenCalled()
    })

    it("proceeds when utilization is exactly at threshold (0.9)", async () => {
      const atThreshold: HealthCheckFn = () => ({ utilization: 0.9 })
      mockListDeadLetters.mockResolvedValueOnce([])

      const result = await runAutoRetry(atThreshold)

      expect(result.skippedHealth).toBe(false)
      expect(mockListDeadLetters).toHaveBeenCalled()
    })
  })

  // ── v2: Priority ordering ───────────────────────

  describe("priority ordering", () => {
    it("retries checkout.session.completed before other event types", async () => {
      const retryOrder: string[] = []
      mockRetryDeadLetter.mockImplementation(async (id: string) => {
        retryOrder.push(id)
        return { ok: true }
      })

      mockListDeadLetters.mockResolvedValueOnce([
        dlqEntry({ id: "dlq-expired", eventType: "checkout.session.expired", createdAt: new Date(Date.now() - 20 * 60 * 1000) }),
        dlqEntry({ id: "dlq-checkout", eventType: "checkout.session.completed", createdAt: new Date(Date.now() - 15 * 60 * 1000) }),
        dlqEntry({ id: "dlq-payment", eventType: "payment_intent.succeeded", createdAt: new Date(Date.now() - 25 * 60 * 1000) }),
      ])

      await runAutoRetry(healthyCheck)

      expect(retryOrder).toEqual(["dlq-checkout", "dlq-payment", "dlq-expired"])
    })

    it("uses FIFO within same priority", async () => {
      const retryOrder: string[] = []
      mockRetryDeadLetter.mockImplementation(async (id: string) => {
        retryOrder.push(id)
        return { ok: true }
      })

      mockListDeadLetters.mockResolvedValueOnce([
        dlqEntry({ id: "dlq-newer", eventType: "checkout.session.completed", createdAt: new Date(Date.now() - 5 * 60 * 1000) }),
        dlqEntry({ id: "dlq-older", eventType: "checkout.session.completed", createdAt: new Date(Date.now() - 15 * 60 * 1000) }),
      ])

      await runAutoRetry(healthyCheck)

      // Older entry should be retried first within same priority
      expect(retryOrder).toEqual(["dlq-older", "dlq-newer"])
    })
  })

  // ── v2: Rate limiting ───────────────────────────

  describe("rate limiting", () => {
    it("stops after 10 retries per run", async () => {
      // Create 15 eligible entries
      const entries = Array.from({ length: 15 }, (_, i) =>
        dlqEntry({ id: `dlq-${i}` }),
      )
      mockListDeadLetters.mockResolvedValueOnce(entries)
      mockRetryDeadLetter.mockResolvedValue({ ok: true })

      const result = await runAutoRetry(healthyCheck)

      expect(result.scanned).toBe(15)
      expect(result.retried).toBe(10)
      expect(result.skipped).toBe(5)
      expect(mockRetryDeadLetter).toHaveBeenCalledTimes(10)

      // Rate-limited entries should have the right reason
      const rateLimited = result.entries.filter(e => e.reason?.includes("rate limit"))
      expect(rateLimited.length).toBe(5)
    })
  })

  // ── v2: Result shape ────────────────────────────

  it("includes skippedHealth in result", async () => {
    mockListDeadLetters.mockResolvedValueOnce([])

    const result = await runAutoRetry(healthyCheck)

    expect(result).toHaveProperty("skippedHealth")
    expect(typeof result.skippedHealth).toBe("boolean")
  })
})
