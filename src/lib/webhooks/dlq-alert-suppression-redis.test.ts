import { describe, it, expect, vi, beforeEach } from "vitest"
import { applySuppressionsRedis, type RedisClient } from "./dlq-alert-suppression-redis"
import type { DlqAlert } from "./dlq-alert-engine"

// ── Helpers ─────────────────────────────────────────────

function makeAlert(overrides: Partial<DlqAlert> = {}): DlqAlert {
  return {
    severity: "P2",
    eventType: "checkout.session.completed",
    error: "connection refused",
    count: 5,
    correlationIds: ["evt_1", "evt_2", "evt_3", "evt_4", "evt_5"],
    action: "retry",
    reason: "Transient failure",
    dashboardUrl: "/dashboard/dead-letters",
    ...overrides,
  }
}

const NOW = 1_000_000_000_000
const COOLDOWN = 10 * 60 * 1000

/** In-memory Redis mock — supports get/set with NX and EX flags. */
function createMockRedis(): RedisClient & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, options?: { NX?: boolean }) => {
      if (options?.NX && store.has(key)) return null // NX: don't overwrite
      store.set(key, value)
      return "OK"
    }),
  }
}

// ── Tests ───────────────────────────────────────────────

describe("applySuppressionsRedis", () => {
  let redis: ReturnType<typeof createMockRedis>

  beforeEach(() => {
    redis = createMockRedis()
  })

  // ── New incident ────────────────────────────────────

  it("sends new incident (no prior state in Redis)", async () => {
    const result = await applySuppressionsRedis(
      [makeAlert()],
      redis,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(1)
    expect(result.alertsSuppressed).toHaveLength(0)
    expect(result.alertsEscalated).toHaveLength(0)
  })

  it("writes state to Redis after sending", async () => {
    await applySuppressionsRedis([makeAlert()], redis, { now: NOW })

    const key = "dlq:incident:checkout.session.completed::connection refused"
    expect(redis.store.has(key)).toBe(true)

    const stored = JSON.parse(redis.store.get(key)!)
    expect(stored.lastAlertedAt).toBe(NOW)
    expect(stored.lastSeverity).toBe("P2")
    expect(stored.lastCount).toBe(5)
  })

  it("sets TTL on Redis write", async () => {
    await applySuppressionsRedis([makeAlert()], redis, { now: NOW })

    // Verify set was called with EX + NX (atomic claim for new incidents)
    expect(redis.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ EX: 86400 }), // 24 hours in seconds
    )
  })

  // ── Suppression inside cooldown ─────────────────────

  it("suppresses duplicate alert inside cooldown", async () => {
    // Seed Redis with a recent record
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - 5 * 60 * 1000, // 5 min ago
      lastSeverity: "P2",
      lastCount: 5,
    }))

    const result = await applySuppressionsRedis(
      [makeAlert()],
      redis,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(0)
    expect(result.alertsSuppressed).toHaveLength(1)
  })

  it("does NOT write to Redis on suppression", async () => {
    const key = "dlq:incident:checkout.session.completed::connection refused"
    const original = JSON.stringify({
      lastAlertedAt: NOW - 5 * 60 * 1000,
      lastSeverity: "P2",
      lastCount: 5,
    })
    redis.store.set(key, original)

    await applySuppressionsRedis([makeAlert()], redis, { now: NOW })

    // Value unchanged — no write-back on suppression
    expect(redis.store.get(key)).toBe(original)
  })

  // ── Cooldown expired ────────────────────────────────

  it("sends alert after cooldown expires", async () => {
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - COOLDOWN - 1,
      lastSeverity: "P2",
      lastCount: 5,
    }))

    const result = await applySuppressionsRedis(
      [makeAlert()],
      redis,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(1)
    expect(result.alertsSuppressed).toHaveLength(0)
  })

  // ── Severity upgrade ────────────────────────────────

  it("escalates on severity upgrade P2 → P1", async () => {
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - 2 * 60 * 1000,
      lastSeverity: "P2",
      lastCount: 5,
    }))

    const result = await applySuppressionsRedis(
      [makeAlert({ severity: "P1" })],
      redis,
      { now: NOW },
    )

    expect(result.alertsEscalated).toHaveLength(1)
    expect(result.alertsSuppressed).toHaveLength(0)

    // State updated in Redis
    const stored = JSON.parse(redis.store.get(key)!)
    expect(stored.lastSeverity).toBe("P1")
    expect(stored.lastAlertedAt).toBe(NOW)
  })

  // ── Count spike ─────────────────────────────────────

  it("escalates on count spike (>= 2x)", async () => {
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - 3 * 60 * 1000,
      lastSeverity: "P2",
      lastCount: 5,
    }))

    const result = await applySuppressionsRedis(
      [makeAlert({ count: 10 })], // 10 >= 5*2
      redis,
      { now: NOW },
    )

    expect(result.alertsEscalated).toHaveLength(1)
  })

  it("suppresses when count below spike threshold", async () => {
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - 3 * 60 * 1000,
      lastSeverity: "P2",
      lastCount: 5,
    }))

    const result = await applySuppressionsRedis(
      [makeAlert({ count: 7 })], // 7 < 5*2
      redis,
      { now: NOW },
    )

    expect(result.alertsSuppressed).toHaveLength(1)
  })

  // ── Different errors = separate incidents ───────────

  it("treats different normalized errors as separate incidents", async () => {
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - 1 * 60 * 1000,
      lastSeverity: "P2",
      lastCount: 5,
    }))

    const result = await applySuppressionsRedis(
      [
        makeAlert({ error: "connection refused", count: 5 }),
        makeAlert({ error: "statement timeout", count: 3 }),
      ],
      redis,
      { now: NOW },
    )

    expect(result.alertsSuppressed).toHaveLength(1) // connection refused
    expect(result.alertsToSend).toHaveLength(1)     // statement timeout (new)
    expect(result.alertsToSend[0]!.error).toBe("statement timeout")
  })

  // ── Redis failure ───────────────────────────────────

  it("treats Redis read failure as new incident (fail-open)", async () => {
    const failRedis: RedisClient = {
      get: vi.fn(async () => { throw new Error("Redis down") }),
      set: vi.fn(async () => {}),
    }

    const result = await applySuppressionsRedis(
      [makeAlert()],
      failRedis,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(1) // sent, not crashed
  })

  it("swallows Redis write failure without crashing", async () => {
    const failRedis: RedisClient = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => { throw new Error("Redis write failed") }),
    }

    const result = await applySuppressionsRedis(
      [makeAlert()],
      failRedis,
      { now: NOW },
    )

    // Should still return the alert as sent
    expect(result.alertsToSend).toHaveLength(1)
  })

  // ── Atomicity ────────────────────────────────────────

  it("uses SET NX for new incidents (atomic claim)", async () => {
    await applySuppressionsRedis([makeAlert()], redis, { now: NOW })

    // First set call should use NX
    const firstSetCall = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(firstSetCall[2]).toEqual(expect.objectContaining({ NX: true }))
  })

  it("second instance suppresses when first claims via NX", async () => {
    // Simulate: instance A already claimed the key via SET NX
    const key = "dlq:incident:checkout.session.completed::connection refused"
    redis.store.set(key, JSON.stringify({
      lastAlertedAt: NOW - 1000, // just now
      lastSeverity: "P2",
      lastCount: 5,
    }))

    // Instance B tries the same alert — SET NX fails, GET finds it, suppresses
    const result = await applySuppressionsRedis(
      [makeAlert({ severity: "P2", count: 5 })],
      redis,
      { now: NOW },
    )

    expect(result.alertsSuppressed).toHaveLength(1)
    expect(result.alertsToSend).toHaveLength(0)
  })

  // ── Empty input ─────────────────────────────────────

  it("returns empty results for empty input", async () => {
    const result = await applySuppressionsRedis([], redis, { now: NOW })
    expect(result.alertsToSend).toHaveLength(0)
    expect(result.alertsSuppressed).toHaveLength(0)
    expect(result.alertsEscalated).toHaveLength(0)
  })
})
