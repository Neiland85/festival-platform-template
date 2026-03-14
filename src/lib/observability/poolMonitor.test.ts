/**
 * Tests para M7: DB Connection Pool Monitor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getPoolHealth,
  recordPoolEvent,
  resetPoolMonitor,
  type PoolLike,
} from "./poolMonitor"

function mockPool(overrides?: Partial<PoolLike>): PoolLike {
  return {
    totalCount: 2,
    idleCount: 2,
    waitingCount: 0,
    options: { max: 5 },
    ...overrides,
  }
}

describe("poolMonitor", () => {
  beforeEach(() => {
    resetPoolMonitor()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("getPoolHealth() — levels", () => {
    it("returns HEALTHY when pool is idle", () => {
      const health = getPoolHealth(mockPool({ totalCount: 2, idleCount: 2, waitingCount: 0 }))
      expect(health.level).toBe("HEALTHY")
      expect(health.alerts).toHaveLength(0)
    })

    it("returns HEALTHY when utilization < 80%", () => {
      const health = getPoolHealth(mockPool({ totalCount: 3, idleCount: 1, waitingCount: 0 }))
      // active = 2, max = 5, utilization = 40%
      expect(health.level).toBe("HEALTHY")
    })

    it("returns PRESSURE when utilization >= 80%", () => {
      const health = getPoolHealth(mockPool({ totalCount: 5, idleCount: 1, waitingCount: 0 }))
      // active = 4, max = 5, utilization = 80%
      expect(health.level).toBe("PRESSURE")
      expect(health.alerts.some((a) => a.code === "pool_pressure")).toBe(true)
    })

    it("returns PRESSURE when all connections active but none waiting", () => {
      const health = getPoolHealth(mockPool({ totalCount: 5, idleCount: 0, waitingCount: 0 }))
      expect(health.level).toBe("PRESSURE")
    })

    it("returns EXHAUSTED when queries are waiting", () => {
      const health = getPoolHealth(mockPool({ totalCount: 5, idleCount: 0, waitingCount: 3 }))
      expect(health.level).toBe("EXHAUSTED")
      expect(health.alerts.some((a) => a.code === "pool_exhausted")).toBe(true)
      expect(health.alerts.some((a) => a.code === "pool_waiting")).toBe(true)
    })
  })

  describe("stats", () => {
    it("calculates active connections correctly", () => {
      const health = getPoolHealth(mockPool({ totalCount: 4, idleCount: 1 }))
      expect(health.stats.active).toBe(3)
      expect(health.stats.idle).toBe(1)
      expect(health.stats.total).toBe(4)
    })

    it("calculates utilization percentage", () => {
      const health = getPoolHealth(mockPool({ totalCount: 3, idleCount: 0 }))
      // active = 3, max = 5 → 60%
      expect(health.utilization).toBe("60%")
    })

    it("includes max pool size", () => {
      const health = getPoolHealth(mockPool())
      expect(health.stats.max).toBe(5)
    })

    it("defaults max to 5 when not in options", () => {
      const pool: PoolLike = { totalCount: 2, idleCount: 2, waitingCount: 0 }
      const health = getPoolHealth(pool)
      expect(health.stats.max).toBe(5)
    })

    it("includes checkedAt timestamp", () => {
      const health = getPoolHealth(mockPool())
      expect(health.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("recordPoolEvent()", () => {
    it("records events in history", () => {
      recordPoolEvent("connect")
      recordPoolEvent("acquire")
      recordPoolEvent("release")

      const health = getPoolHealth(mockPool())
      expect(health.events).toHaveLength(3)
    })

    it("stores error message", () => {
      recordPoolEvent("error", "Connection refused")

      const health = getPoolHealth(mockPool())
      const errorEvent = health.events.find((e) => e.type === "error")
      expect(errorEvent).toBeDefined()
      expect(errorEvent!.message).toBe("Connection refused")
    })

    it("emits structured log for errors", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})

      recordPoolEvent("error", "timeout")

      expect(spy).toHaveBeenCalled()
      const output = spy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output)
      expect(parsed.code).toBe("pool_connection_error")
    })

    it("limits events to 100 max", () => {
      for (let i = 0; i < 120; i++) {
        recordPoolEvent("acquire")
      }

      const health = getPoolHealth(mockPool())
      // events are sliced to last 20 in response, but internal buffer is 100
      expect(health.events.length).toBeLessThanOrEqual(20)
    })
  })

  describe("error tracking", () => {
    it("counts errors in last hour", () => {
      recordPoolEvent("error", "Connection refused")
      recordPoolEvent("error", "Timeout")
      recordPoolEvent("connect") // not an error

      const health = getPoolHealth(mockPool())
      expect(health.errors).toBe(2)
    })

    it("excludes errors older than 1 hour", () => {
      vi.useFakeTimers()

      recordPoolEvent("error", "Old error")
      vi.advanceTimersByTime(61 * 60 * 1000) // 61 minutes

      recordPoolEvent("error", "Recent error")

      const health = getPoolHealth(mockPool())
      expect(health.errors).toBe(1)
    })

    it("includes error alert when errors exist", () => {
      recordPoolEvent("error", "Connection lost")

      const health = getPoolHealth(mockPool())
      expect(health.alerts.some((a) => a.code === "pool_errors")).toBe(true)
    })
  })

  describe("waiting alert", () => {
    it("sets waitingAlert when queries waiting", () => {
      const health = getPoolHealth(mockPool({ waitingCount: 2 }))
      expect(health.waitingAlert).toBe(true)
    })

    it("waitingAlert is false when no queries waiting", () => {
      const health = getPoolHealth(mockPool({ waitingCount: 0 }))
      expect(health.waitingAlert).toBe(false)
    })
  })

  describe("structured logging", () => {
    it("emits JSON log for alerts", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})

      getPoolHealth(mockPool({ totalCount: 5, idleCount: 0, waitingCount: 3 }))

      expect(spy).toHaveBeenCalled()
      const calls = spy.mock.calls.map((c) => JSON.parse(c[0] as string))
      expect(calls.some((c) => c.code === "pool_exhausted")).toBe(true)
    })

    it("does NOT log when healthy", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})

      getPoolHealth(mockPool({ totalCount: 2, idleCount: 2, waitingCount: 0 }))

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe("resetPoolMonitor()", () => {
    it("clears all events", () => {
      recordPoolEvent("error", "test")
      recordPoolEvent("connect")

      resetPoolMonitor()

      const health = getPoolHealth(mockPool())
      expect(health.events).toHaveLength(0)
      expect(health.errors).toBe(0)
    })
  })

  describe("Solaris Nerja scenario", () => {
    it("detects pool exhaustion during lineup announcement surge", () => {
      // Simula: 5 queries lentas simultáneas + 3 esperando
      const pool = mockPool({
        totalCount: 5,
        idleCount: 0,
        waitingCount: 3,
      })

      // Registrar errores de timeout
      recordPoolEvent("error", "Query timeout after 30s")
      recordPoolEvent("waiting", "Queue depth: 3")

      const health = getPoolHealth(pool)

      expect(health.level).toBe("EXHAUSTED")
      expect(health.waitingAlert).toBe(true)
      expect(health.utilization).toBe("100%")
      expect(health.errors).toBe(1)
      expect(health.alerts.length).toBeGreaterThanOrEqual(2)
    })
  })
})
