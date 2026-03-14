/**
 * Tests para M6: Queue Depth Alert System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  checkQueueHealth,
  recordQueueSample,
  resetQueueAlert,
} from "./queueAlert"

describe("queueAlert", () => {
  beforeEach(() => {
    resetQueueAlert()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("checkQueueHealth() — levels", () => {
    it("returns NORMAL for empty queue with no alerts", () => {
      const health = checkQueueHealth(0)
      expect(health.level).toBe("NORMAL")
      expect(health.size).toBe(0)
      expect(health.alerts).toHaveLength(0)
    })

    it("returns NORMAL for size < 50", () => {
      const health = checkQueueHealth(10)
      expect(health.level).toBe("NORMAL")
      // No depth-level alerts (drain_stalled is operational, not depth)
      const depthAlerts = health.alerts.filter((a) => a.code.startsWith("queue_depth"))
      expect(depthAlerts).toHaveLength(0)
    })

    it("returns WARNING for size 50-199", () => {
      const health = checkQueueHealth(75)
      expect(health.level).toBe("WARNING")
      expect(health.alerts.some((a) => a.code === "queue_depth_warning")).toBe(true)
    })

    it("returns CRITICAL for size 200-499", () => {
      const health = checkQueueHealth(300)
      expect(health.level).toBe("CRITICAL")
      expect(health.alerts.some((a) => a.code === "queue_depth_critical")).toBe(true)
    })

    it("returns OVERFLOW for size >= 500", () => {
      const health = checkQueueHealth(600)
      expect(health.level).toBe("OVERFLOW")
      expect(health.alerts.some((a) => a.code === "queue_overflow")).toBe(true)
    })

    it("includes thresholds in response", () => {
      const health = checkQueueHealth(0)
      expect(health.thresholds).toEqual({
        warning: 50,
        critical: 200,
        overflow: 500,
      })
    })

    it("includes checkedAt timestamp", () => {
      const health = checkQueueHealth(0)
      expect(health.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("drain rate calculation", () => {
    it("calculates drain rate from samples", () => {
      vi.useFakeTimers()

      // Sample 1: 100 items, 0 drained
      recordQueueSample(100, 0, 10)
      vi.advanceTimersByTime(60_000) // 1 min

      // Sample 2: 80 items, 20 drained, 0 ingested
      recordQueueSample(80, 20, 0)

      const health = checkQueueHealth(80)
      expect(health.drainRate).toBe(20) // 20 drained / 1 min
    })

    it("returns 0 drain rate with single sample", () => {
      recordQueueSample(50, 0, 0)
      const health = checkQueueHealth(50)
      expect(health.drainRate).toBe(0)
    })

    it("calculates ingestion rate from samples", () => {
      vi.useFakeTimers()

      recordQueueSample(10, 0, 0)
      vi.advanceTimersByTime(60_000)

      recordQueueSample(60, 0, 50)

      const health = checkQueueHealth(60)
      expect(health.ingestionRate).toBe(50) // 50 ingested / 1 min
    })
  })

  describe("time to drain", () => {
    it("returns '0s' when queue is empty", () => {
      const health = checkQueueHealth(0)
      expect(health.timeToDrain).toBe("0s")
    })

    it("returns '∞' when drain rate is 0 and queue has items", () => {
      recordQueueSample(100, 0, 0)
      const health = checkQueueHealth(100)
      expect(health.timeToDrain).toBe("∞")
    })

    it("returns '∞' when ingestion exceeds drain", () => {
      vi.useFakeTimers()

      recordQueueSample(100, 0, 0)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(150, 10, 60)

      const health = checkQueueHealth(150)
      expect(health.timeToDrain).toBe("∞")
    })

    it("estimates time when net drain is positive", () => {
      vi.useFakeTimers()

      recordQueueSample(100, 0, 0)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(60, 50, 10) // net drain: 50-10 = 40/min

      const health = checkQueueHealth(60)
      // 60 items / 40/min = 1.5 min = "1m 30s"
      expect(health.timeToDrain).toMatch(/\d+m \d+s/)
    })
  })

  describe("backpressure detection", () => {
    it("detects backpressure when ingestion > drain for >2 min", () => {
      vi.useFakeTimers()

      recordQueueSample(50, 0, 0)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(80, 5, 35)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(110, 5, 35)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(140, 5, 35)

      const health = checkQueueHealth(140)
      expect(health.backpressure).toBe(true)
      expect(health.alerts.some((a) => a.code === "queue_backpressure")).toBe(true)
    })

    it("does NOT detect backpressure when drain >= ingestion", () => {
      vi.useFakeTimers()

      recordQueueSample(100, 0, 0)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(80, 30, 10)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(60, 30, 10)

      const health = checkQueueHealth(60)
      expect(health.backpressure).toBe(false)
    })

    it("does NOT detect backpressure with insufficient samples", () => {
      recordQueueSample(100, 0, 50)
      const health = checkQueueHealth(100)
      expect(health.backpressure).toBe(false)
    })
  })

  describe("stalled drain alert", () => {
    it("alerts when queue has items but drain is 0", () => {
      recordQueueSample(100, 0, 0)
      const health = checkQueueHealth(100)

      expect(health.alerts.some((a) => a.code === "queue_drain_stalled")).toBe(true)
    })

    it("does NOT alert stalled when queue is empty", () => {
      const health = checkQueueHealth(0)
      expect(health.alerts.some((a) => a.code === "queue_drain_stalled")).toBe(false)
    })
  })

  describe("structured logging", () => {
    it("emits JSON log for each alert", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})

      checkQueueHealth(300) // CRITICAL

      expect(spy).toHaveBeenCalled()
      const output = spy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output)
      expect(parsed.code).toBe("queue_depth_critical")
      expect(parsed.queueSize).toBe(300)
    })

    it("does NOT log when NORMAL and healthy", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})

      vi.useFakeTimers()
      recordQueueSample(5, 0, 0)
      vi.advanceTimersByTime(60_000)
      recordQueueSample(3, 5, 3)

      checkQueueHealth(3)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe("recordQueueSample()", () => {
    it("stores samples in history", () => {
      recordQueueSample(10, 0, 5)
      recordQueueSample(15, 0, 5)

      const health = checkQueueHealth(15)
      expect(health.history).toHaveLength(2)
    })

    it("limits history to 10 samples", () => {
      for (let i = 0; i < 15; i++) {
        recordQueueSample(i * 10, 0, 0)
      }

      const health = checkQueueHealth(140)
      expect(health.history.length).toBeLessThanOrEqual(10)
    })
  })

  describe("resetQueueAlert()", () => {
    it("clears all state", () => {
      recordQueueSample(100, 10, 20)
      recordQueueSample(110, 10, 20)

      resetQueueAlert()

      const health = checkQueueHealth(0)
      expect(health.history).toHaveLength(0)
      expect(health.drainRate).toBe(0)
      expect(health.ingestionRate).toBe(0)
    })
  })

  describe("festival surge scenario", () => {
    it("simulates queue growing during lineup announcement", () => {
      vi.useFakeTimers()

      // Minuto 0: normal
      recordQueueSample(5, 5, 5)

      // Minuto 1-3: surge hits, ingestion >> drain
      vi.advanceTimersByTime(60_000)
      recordQueueSample(50, 5, 50)

      vi.advanceTimersByTime(60_000)
      recordQueueSample(120, 5, 75)

      vi.advanceTimersByTime(60_000)
      recordQueueSample(250, 5, 135)

      const health = checkQueueHealth(250)

      // Should be CRITICAL
      expect(health.level).toBe("CRITICAL")

      // Should detect backpressure
      expect(health.backpressure).toBe(true)

      // Time to drain should be high or infinite
      expect(["∞"].includes(health.timeToDrain) || health.timeToDrain.includes("m")).toBe(true)

      // Should have multiple alerts
      expect(health.alerts.length).toBeGreaterThanOrEqual(2)
    })
  })
})
