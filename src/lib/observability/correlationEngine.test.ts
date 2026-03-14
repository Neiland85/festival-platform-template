/**
 * M8: Analytics Correlation Engine — Tests
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  ingestSignal,
  correlate,
  getAlerts,
  getTimeline,
  resetCorrelation,
  type SignalSource,
  type HealthLevel,
} from "./correlationEngine"

// ── Helpers ──────────────────────────────────────────────

function signal(source: SignalSource, score: number, details?: string) {
  ingestSignal({ source, level: scoreToLevel(score), score, details })
}

function scoreToLevel(score: number): HealthLevel {
  if (score >= 80) return "GREEN"
  if (score >= 60) return "YELLOW"
  if (score >= 40) return "ORANGE"
  return "RED"
}

function allHealthy() {
  const sources: SignalSource[] = ["metrics", "audit", "surge", "cache", "seo", "queue", "pool"]
  for (const s of sources) signal(s, 95)
}

// ── Setup ────────────────────────────────────────────────

beforeEach(() => {
  resetCorrelation()
  vi.useFakeTimers({ now: new Date("2026-03-10T12:00:00Z") })
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Basic functionality ──────────────────────────────────

describe("correlationEngine", () => {
  describe("ingestSignal + correlate basics", () => {
    it("returns 100 when no signals ingested", () => {
      const r = correlate()
      expect(r.overallScore).toBe(100)
      expect(r.overallLevel).toBe("GREEN")
    })

    it("computes weighted score from single signal", () => {
      signal("metrics", 50)
      const r = correlate()
      // Only metrics weight, so overall = 50
      expect(r.overallScore).toBe(50)
      expect(r.signalScores.metrics).toBe(50)
    })

    it("computes weighted average across all signals", () => {
      allHealthy()
      const r = correlate()
      expect(r.overallScore).toBe(95)
      expect(r.overallLevel).toBe("GREEN")
    })

    it("clamps score to 0-100 range", () => {
      ingestSignal({ source: "metrics", level: "GREEN", score: 150 })
      ingestSignal({ source: "queue", level: "RED", score: -20 })
      const r = correlate()
      expect(r.signalScores.metrics).toBe(100)
      expect(r.signalScores.queue).toBe(0)
    })

    it("returns null for sources without signals", () => {
      signal("metrics", 80)
      const r = correlate()
      expect(r.signalScores.metrics).toBe(80)
      expect(r.signalScores.queue).toBeNull()
      expect(r.signalScores.pool).toBeNull()
    })
  })

  // ── Level thresholds ───────────────────────────────────

  describe("health levels", () => {
    it("GREEN when score >= 80", () => {
      signal("metrics", 85)
      expect(correlate().overallLevel).toBe("GREEN")
    })

    it("YELLOW when score 60-79", () => {
      signal("metrics", 65)
      expect(correlate().overallLevel).toBe("YELLOW")
    })

    it("ORANGE when score 40-59", () => {
      signal("metrics", 45)
      expect(correlate().overallLevel).toBe("ORANGE")
    })

    it("RED when score < 40", () => {
      signal("metrics", 20)
      expect(correlate().overallLevel).toBe("RED")
    })
  })

  // ── Pattern detection ──────────────────────────────────

  describe("correlation patterns", () => {
    it("detects backpressure_cascade (queue + pool both <50)", () => {
      signal("queue", 30)
      signal("pool", 25)
      const r = correlate()
      const bp = r.alerts.find(a => a.pattern === "backpressure_cascade")
      expect(bp).toBeDefined()
      expect(bp!.severity).toBe("RED")
      expect(bp!.sources).toContain("queue")
      expect(bp!.sources).toContain("pool")
    })

    it("detects traffic_overload (surge + queue both <60)", () => {
      signal("surge", 40)
      signal("queue", 45)
      const r = correlate()
      const to = r.alerts.find(a => a.pattern === "traffic_overload")
      expect(to).toBeDefined()
      expect(to!.severity).toBe("ORANGE")
    })

    it("detects infra_failure (metrics + pool both <50)", () => {
      signal("metrics", 30)
      signal("pool", 20)
      const r = correlate()
      const inf = r.alerts.find(a => a.pattern === "infra_failure")
      expect(inf).toBeDefined()
      expect(inf!.severity).toBe("RED")
    })

    it("detects cache_miss_storm (cache <50 + metrics <70)", () => {
      signal("cache", 30)
      signal("metrics", 60)
      const r = correlate()
      const cms = r.alerts.find(a => a.pattern === "cache_miss_storm")
      expect(cms).toBeDefined()
      expect(cms!.severity).toBe("ORANGE")
    })

    it("detects systemic_degradation (≥3 signals below 60)", () => {
      signal("metrics", 40)
      signal("queue", 30)
      signal("pool", 20)
      signal("cache", 90) // this one is fine
      const r = correlate()
      const sd = r.alerts.find(a => a.pattern === "systemic_degradation")
      expect(sd).toBeDefined()
      expect(sd!.sources.length).toBe(3)
    })

    it("does NOT fire patterns when signals are healthy", () => {
      allHealthy()
      const r = correlate()
      expect(r.alerts).toHaveLength(0)
    })

    it("does NOT fire backpressure if only one signal is low", () => {
      signal("queue", 30)
      signal("pool", 85)
      const r = correlate()
      const bp = r.alerts.find(a => a.pattern === "backpressure_cascade")
      expect(bp).toBeUndefined()
    })
  })

  // ── Alerts ─────────────────────────────────────────────

  describe("alert management", () => {
    it("accumulates alerts across correlate() calls", () => {
      signal("queue", 30)
      signal("pool", 25)
      correlate()
      expect(getAlerts().length).toBeGreaterThan(0)

      // Second correlation with same bad state
      vi.advanceTimersByTime(60_000)
      correlate()
      expect(getAlerts().length).toBeGreaterThan(1)
    })

    it("caps alert ring buffer at 50", () => {
      signal("queue", 30)
      signal("pool", 25)
      for (let i = 0; i < 55; i++) {
        vi.advanceTimersByTime(1000)
        correlate()
      }
      // Each correlate fires multiple patterns, but ring capped at 50
      expect(getAlerts().length).toBeLessThanOrEqual(50)
    })

    it("logs alerts as structured JSON to stdout", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})
      signal("queue", 30)
      signal("pool", 25)
      correlate()
      expect(spy).toHaveBeenCalled()
      const call = spy.mock.calls[0]?.[0] as string
      const parsed = JSON.parse(call)
      expect(parsed.level).toBe("correlation_alert")
      expect(parsed.alertId).toMatch(/^corr-/)
      spy.mockRestore()
    })
  })

  // ── Timeline ───────────────────────────────────────────

  describe("timeline", () => {
    it("builds timeline on each correlate()", () => {
      allHealthy()
      correlate()
      vi.advanceTimersByTime(60_000)
      correlate()
      const tl = getTimeline()
      expect(tl).toHaveLength(2)
      expect(tl[0]!.score).toBe(95)
    })

    it("caps timeline at 120 entries", () => {
      allHealthy()
      for (let i = 0; i < 130; i++) {
        vi.advanceTimersByTime(60_000)
        correlate()
      }
      expect(getTimeline().length).toBe(120)
    })

    it("timeline entries have correct shape", () => {
      signal("metrics", 70)
      correlate()
      const entry = getTimeline()[0]!
      expect(entry).toHaveProperty("timestamp")
      expect(entry).toHaveProperty("score")
      expect(entry).toHaveProperty("level")
      expect(typeof entry.timestamp).toBe("number")
    })
  })

  // ── Trend detection ────────────────────────────────────

  describe("trend", () => {
    it("returns stable when <3 timeline entries", () => {
      allHealthy()
      correlate()
      expect(correlate().trend).toBe("stable")
    })

    it("detects improving trend", () => {
      signal("metrics", 50)
      correlate()
      vi.advanceTimersByTime(60_000)
      signal("metrics", 60)
      correlate()
      vi.advanceTimersByTime(60_000)
      signal("metrics", 75)
      correlate()
      vi.advanceTimersByTime(60_000)
      signal("metrics", 90)
      const r = correlate()
      expect(r.trend).toBe("improving")
    })

    it("detects degrading trend", () => {
      signal("metrics", 90)
      correlate()
      vi.advanceTimersByTime(60_000)
      signal("metrics", 75)
      correlate()
      vi.advanceTimersByTime(60_000)
      signal("metrics", 55)
      correlate()
      vi.advanceTimersByTime(60_000)
      signal("metrics", 35)
      const r = correlate()
      expect(r.trend).toBe("degrading")
    })
  })

  // ── Pearson correlation ────────────────────────────────

  describe("cross-signal correlations", () => {
    it("computes correlations when ≥5 timeline entries exist", () => {
      for (let i = 0; i < 6; i++) {
        signal("metrics", 80 + i)
        signal("queue", 80 + i)
        vi.advanceTimersByTime(60_000)
        correlate()
      }
      const r = correlate()
      const c = r.correlations.find(
        c => c.sources.includes("metrics") && c.sources.includes("queue")
      )
      expect(c).toBeDefined()
      expect(c!.coefficient).toBeGreaterThan(0.9) // perfect positive correlation
      expect(c!.interpretation).toBe("strong positive")
    })

    it("returns empty correlations when <5 entries", () => {
      signal("metrics", 80)
      signal("queue", 80)
      correlate()
      vi.advanceTimersByTime(60_000)
      correlate()
      const r = correlate()
      expect(r.correlations).toHaveLength(0)
    })

    it("detects negative correlation", () => {
      for (let i = 0; i < 7; i++) {
        signal("cache", 50 + i * 5)   // improving
        signal("metrics", 90 - i * 5) // degrading
        vi.advanceTimersByTime(60_000)
        correlate()
      }
      const r = correlate()
      const c = r.correlations.find(
        c => c.sources.includes("cache") && c.sources.includes("metrics")
      )
      expect(c).toBeDefined()
      expect(c!.coefficient).toBeLessThan(-0.9)
      expect(c!.interpretation).toBe("strong negative")
    })
  })

  // ── Reset ──────────────────────────────────────────────

  describe("resetCorrelation", () => {
    it("clears all state", () => {
      allHealthy()
      correlate()
      correlate()
      expect(getTimeline().length).toBeGreaterThan(0)

      resetCorrelation()
      expect(getTimeline()).toHaveLength(0)
      expect(getAlerts()).toHaveLength(0)
      const r = correlate()
      expect(r.overallScore).toBe(100)
    })
  })

  // ── Report shape ───────────────────────────────────────

  describe("report shape", () => {
    it("returns all required fields", () => {
      allHealthy()
      const r = correlate()
      expect(r).toHaveProperty("overallScore")
      expect(r).toHaveProperty("overallLevel")
      expect(r).toHaveProperty("signalScores")
      expect(r).toHaveProperty("alerts")
      expect(r).toHaveProperty("trend")
      expect(r).toHaveProperty("timeline")
      expect(r).toHaveProperty("correlations")
      expect(r).toHaveProperty("collectedAt")
      expect(r.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("signalScores has all 7 sources", () => {
      allHealthy()
      const r = correlate()
      const keys = Object.keys(r.signalScores)
      expect(keys).toHaveLength(7)
      expect(keys).toContain("metrics")
      expect(keys).toContain("pool")
    })
  })
})
