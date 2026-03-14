/**
 * M10: Infrastructure Safety Scorecard — Tests
 */
import { describe, it, expect } from "vitest"
import {
  generateScorecard,
  type ScorecardInput,
  type MetricsInput,
  type PoolInput,
  type QueueInput,
  type CacheInput,
  type SEOInput,
  type TracingInput,
  type CorrelationInput,
  type AuditInput,
} from "./safetyScorecard"

// ── Fixtures ─────────────────────────────────────────────

const healthyMetrics: MetricsInput = {
  totalRequests: 500,
  totalErrors: 2,
  routes: [
    { route: "/api/events", p95: 120, p99: 250, errorRate: "0.5", requests: 300 },
    { route: "/api/leads", p95: 80, p99: 180, errorRate: "0.3", requests: 200 },
  ],
}

const healthyPool: PoolInput = {
  level: "HEALTHY",
  stats: { total: 5, idle: 3, active: 2, waiting: 0, max: 5 },
  utilization: "40.0",
  errors: [],
}

const healthyQueue: QueueInput = {
  level: "NORMAL",
  currentSize: 5,
  alerts: [],
}

const healthyCache: CacheInput = {
  hits: 80,
  misses: 15,
  staleHits: 5,
  size: 20,
}

const healthySEO: SEOInput = {
  score: 92,
  grade: "A",
  issues: [{ severity: "info" }],
}

const healthyTracing: TracingInput = {
  totalTraces: 200,
  activeTraces: 2,
  errorTraces: 3,
  avgDurationMs: 150,
  p95DurationMs: 450,
}

const healthyCorrelation: CorrelationInput = {
  overallScore: 90,
  overallLevel: "GREEN",
  alerts: [],
  trend: "stable",
}

const healthyAudit: AuditInput = {
  totalEntries: 150,
  actionBreakdown: {
    "lead.created": 50,
    "system.queue_drain": 30,
    "admin.login": 20,
    "system.config_change": 50,
  },
}

function fullHealthy(): ScorecardInput {
  return {
    metrics: healthyMetrics,
    pool: healthyPool,
    queue: healthyQueue,
    cache: healthyCache,
    seo: healthySEO,
    tracing: healthyTracing,
    correlation: healthyCorrelation,
    audit: healthyAudit,
  }
}

// ── Tests ────────────────────────────────────────────────

describe("safetyScorecard", () => {
  describe("generateScorecard — healthy system", () => {
    it("returns high overall score for healthy inputs", () => {
      const r = generateScorecard(fullHealthy())
      expect(r.overallScore).toBeGreaterThanOrEqual(85)
      expect(r.overallGrade).toMatch(/^[AB]$/)
    })

    it("all dimensions pass when healthy", () => {
      const r = generateScorecard(fullHealthy())
      expect(r.failing).toBe(0)
      expect(r.passing).toBeGreaterThan(0)
      expect(r.dimensions.length).toBe(9)  // latency + error_rate + pool + queue + cache + seo + tracing + correlation + audit
    })

    it("recommendation is nominal", () => {
      const r = generateScorecard(fullHealthy())
      expect(r.recommendation).toContain("nominal")
    })

    it("includes generatedAt timestamp", () => {
      const r = generateScorecard(fullHealthy())
      expect(r.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("generateScorecard — empty input", () => {
    it("returns 100 with no dimensions when input is empty", () => {
      const r = generateScorecard({})
      expect(r.overallScore).toBe(100)
      expect(r.dimensions).toHaveLength(0)
    })

    it("recommendation mentions no data", () => {
      const r = generateScorecard({})
      expect(r.recommendation).toContain("No data")
    })
  })

  // ── Latency dimension ──────────────────────────────────

  describe("latency dimension", () => {
    it("passes with good P95/P99", () => {
      const r = generateScorecard({ metrics: healthyMetrics })
      const d = r.dimensions.find(d => d.id === "latency")!
      expect(d.status).toBe("pass")
      expect(d.score).toBeGreaterThanOrEqual(90)
    })

    it("degrades with high P95", () => {
      const bad: MetricsInput = {
        ...healthyMetrics,
        routes: [{ route: "/slow", p95: 800, p99: 1500, errorRate: "0", requests: 100 }],
      }
      const r = generateScorecard({ metrics: bad })
      const d = r.dimensions.find(d => d.id === "latency")!
      expect(d.score).toBeLessThan(50)
      expect(d.checks.find(c => c.name.includes("P95"))!.passed).toBe(false)
    })

    it("penalizes insufficient traffic", () => {
      const low: MetricsInput = {
        totalRequests: 3,
        totalErrors: 0,
        routes: [{ route: "/api/events", p95: 50, p99: 80, errorRate: "0", requests: 3 }],
      }
      const r = generateScorecard({ metrics: low })
      const d = r.dimensions.find(d => d.id === "latency")!
      expect(d.checks.find(c => c.name.includes("traffic"))!.passed).toBe(false)
    })
  })

  // ── Error rate dimension ───────────────────────────────

  describe("error rate dimension", () => {
    it("passes with low error rate", () => {
      const r = generateScorecard({ metrics: healthyMetrics })
      const d = r.dimensions.find(d => d.id === "error_rate")!
      expect(d.status).toBe("pass")
    })

    it("fails with high global error rate", () => {
      const bad: MetricsInput = {
        totalRequests: 100,
        totalErrors: 30,
        routes: [{ route: "/api/broken", p95: 100, p99: 200, errorRate: "30.0", requests: 100 }],
      }
      const r = generateScorecard({ metrics: bad })
      const d = r.dimensions.find(d => d.id === "error_rate")!
      expect(d.status).toBe("fail")
      expect(d.score).toBeLessThan(50)
    })

    it("detects hot routes (>10% errors)", () => {
      const hot: MetricsInput = {
        totalRequests: 200,
        totalErrors: 5,
        routes: [
          { route: "/ok", p95: 50, p99: 80, errorRate: "1.0", requests: 150 },
          { route: "/hot", p95: 50, p99: 80, errorRate: "15.0", requests: 50 },
        ],
      }
      const r = generateScorecard({ metrics: hot })
      const d = r.dimensions.find(d => d.id === "error_rate")!
      expect(d.checks.find(c => c.name.includes(">10%"))!.passed).toBe(false)
    })
  })

  // ── Pool dimension ─────────────────────────────────────

  describe("pool dimension", () => {
    it("passes when HEALTHY", () => {
      const r = generateScorecard({ pool: healthyPool })
      const d = r.dimensions.find(d => d.id === "pool")!
      expect(d.status).toBe("pass")
      expect(d.score).toBe(100)
    })

    it("degrades significantly when EXHAUSTED", () => {
      const bad: PoolInput = {
        level: "EXHAUSTED",
        stats: { total: 5, idle: 0, active: 5, waiting: 3, max: 5 },
        utilization: "100.0",
        errors: [{ type: "connection_timeout" }],
      }
      const r = generateScorecard({ pool: bad })
      const d = r.dimensions.find(d => d.id === "pool")!
      expect(d.status).toBe("fail")
      expect(d.score).toBeLessThanOrEqual(15)
    })
  })

  // ── Queue dimension ────────────────────────────────────

  describe("queue dimension", () => {
    it("passes when NORMAL and low size", () => {
      const r = generateScorecard({ queue: healthyQueue })
      const d = r.dimensions.find(d => d.id === "queue")!
      expect(d.status).toBe("pass")
      expect(d.score).toBe(100)
    })

    it("degrades with OVERFLOW and high size", () => {
      const bad: QueueInput = {
        level: "OVERFLOW",
        currentSize: 500,
        alerts: [{ type: "overflow" }, { type: "drain_stalled" }],
      }
      const r = generateScorecard({ queue: bad })
      const d = r.dimensions.find(d => d.id === "queue")!
      expect(d.status).toBe("fail")
    })
  })

  // ── Cache dimension ────────────────────────────────────

  describe("cache dimension", () => {
    it("passes with high hit rate", () => {
      const r = generateScorecard({ cache: healthyCache })
      const d = r.dimensions.find(d => d.id === "cache")!
      expect(d.status).toBe("pass")
    })

    it("degrades with low hit rate", () => {
      const bad: CacheInput = { hits: 10, misses: 80, staleHits: 10, size: 5 }
      const r = generateScorecard({ cache: bad })
      const d = r.dimensions.find(d => d.id === "cache")!
      expect(d.score).toBeLessThan(75)
    })

    it("penalizes high stale rate", () => {
      const stale: CacheInput = { hits: 20, misses: 10, staleHits: 70, size: 30 }
      const r = generateScorecard({ cache: stale })
      const d = r.dimensions.find(d => d.id === "cache")!
      expect(d.checks.find(c => c.name.includes("Stale"))!.passed).toBe(false)
    })
  })

  // ── SEO dimension ──────────────────────────────────────

  describe("seo dimension", () => {
    it("passes with grade A and high score", () => {
      const r = generateScorecard({ seo: healthySEO })
      const d = r.dimensions.find(d => d.id === "seo")!
      expect(d.status).toBe("pass")
    })

    it("caps score at 50 with SEO errors", () => {
      const bad: SEOInput = {
        score: 85,
        grade: "B",
        issues: [{ severity: "error" }, { severity: "error" }],
      }
      const r = generateScorecard({ seo: bad })
      const d = r.dimensions.find(d => d.id === "seo")!
      expect(d.score).toBeLessThanOrEqual(50)
    })
  })

  // ── Tracing dimension ──────────────────────────────────

  describe("tracing dimension", () => {
    it("passes with healthy tracing data", () => {
      const r = generateScorecard({ tracing: healthyTracing })
      const d = r.dimensions.find(d => d.id === "tracing")!
      expect(d.status).toBe("pass")
      expect(d.score).toBeGreaterThanOrEqual(85)
    })

    it("degrades when no traces collected", () => {
      const empty: TracingInput = {
        totalTraces: 0, activeTraces: 0, errorTraces: 0,
        avgDurationMs: 0, p95DurationMs: 0,
      }
      const r = generateScorecard({ tracing: empty })
      const d = r.dimensions.find(d => d.id === "tracing")!
      expect(d.score).toBeLessThan(75)
    })

    it("detects trace leaks (many active)", () => {
      const leaky: TracingInput = {
        totalTraces: 100, activeTraces: 15, errorTraces: 2,
        avgDurationMs: 200, p95DurationMs: 500,
      }
      const r = generateScorecard({ tracing: leaky })
      const d = r.dimensions.find(d => d.id === "tracing")!
      expect(d.checks.find(c => c.name.includes("leaks"))!.passed).toBe(false)
    })
  })

  // ── Correlation dimension ──────────────────────────────

  describe("correlation dimension", () => {
    it("passes when GREEN and stable", () => {
      const r = generateScorecard({ correlation: healthyCorrelation })
      const d = r.dimensions.find(d => d.id === "correlation")!
      expect(d.status).toBe("pass")
    })

    it("degrades with degrading trend and RED alerts", () => {
      const bad: CorrelationInput = {
        overallScore: 40,
        overallLevel: "ORANGE",
        alerts: [{ severity: "RED" }, { severity: "RED" }],
        trend: "degrading",
      }
      const r = generateScorecard({ correlation: bad })
      const d = r.dimensions.find(d => d.id === "correlation")!
      expect(d.score).toBeLessThan(30)
    })
  })

  // ── Audit dimension ────────────────────────────────────

  describe("audit dimension", () => {
    it("passes with active logging and diverse actions", () => {
      const r = generateScorecard({ audit: healthyAudit })
      const d = r.dimensions.find(d => d.id === "audit")!
      expect(d.status).toBe("pass")
      expect(d.score).toBe(100)
    })

    it("degrades with no entries", () => {
      const empty: AuditInput = { totalEntries: 0, actionBreakdown: {} }
      const r = generateScorecard({ audit: empty })
      const d = r.dimensions.find(d => d.id === "audit")!
      expect(d.score).toBeLessThan(60)
    })
  })

  // ── Overall scoring ────────────────────────────────────

  describe("overall scoring", () => {
    it("averages all dimension scores", () => {
      const r = generateScorecard(fullHealthy())
      // All scores are high, so average should be high
      expect(r.overallScore).toBeGreaterThanOrEqual(85)
      expect(r.overallGrade).toMatch(/^[AB]$/)
    })

    it("degrades overall when multiple dimensions fail", () => {
      const input: ScorecardInput = {
        pool: {
          level: "EXHAUSTED",
          stats: { total: 5, idle: 0, active: 5, waiting: 5, max: 5 },
          utilization: "100.0",
          errors: [{ type: "err" }],
        },
        queue: {
          level: "OVERFLOW",
          currentSize: 500,
          alerts: [{ type: "overflow" }],
        },
      }
      const r = generateScorecard(input)
      expect(r.overallGrade).toMatch(/^[DF]$/)
      expect(r.failing).toBeGreaterThanOrEqual(2)
    })

    it("recommendation lists failing dimensions", () => {
      const input: ScorecardInput = {
        pool: {
          level: "ERROR",
          stats: { total: 0, idle: 0, active: 0, waiting: 0, max: 5 },
          utilization: "0.0",
          errors: [{ type: "err" }],
        },
      }
      const r = generateScorecard(input)
      expect(r.recommendation).toContain("CRITICAL")
      expect(r.recommendation).toContain("DB Connection Pool")
    })

    it("recommendation lists warning dimensions", () => {
      const input: ScorecardInput = {
        tracing: {
          totalTraces: 0, activeTraces: 0, errorTraces: 0,
          avgDurationMs: 0, p95DurationMs: 0,
        },
      }
      const r = generateScorecard(input)
      expect(r.recommendation).toContain("WARNING")
    })
  })

  // ── Grades ─────────────────────────────────────────────

  describe("grade mapping", () => {
    it("A for score ≥ 90", () => {
      const r = generateScorecard({ seo: { score: 95, grade: "A", issues: [] } })
      const d = r.dimensions.find(d => d.id === "seo")!
      expect(d.grade).toBe("A")
    })

    it("F for very low score", () => {
      const r = generateScorecard({
        pool: {
          level: "EXHAUSTED",
          stats: { total: 5, idle: 0, active: 5, waiting: 10, max: 5 },
          utilization: "100.0",
          errors: [{ type: "e1" }, { type: "e2" }],
        },
      })
      const d = r.dimensions.find(d => d.id === "pool")!
      expect(d.grade).toMatch(/^[DF]$/)
    })
  })

  // ── Report shape ───────────────────────────────────────

  describe("report shape", () => {
    it("includes all expected top-level fields", () => {
      const r = generateScorecard(fullHealthy())
      expect(r).toHaveProperty("overallScore")
      expect(r).toHaveProperty("overallGrade")
      expect(r).toHaveProperty("dimensions")
      expect(r).toHaveProperty("passing")
      expect(r).toHaveProperty("warning")
      expect(r).toHaveProperty("failing")
      expect(r).toHaveProperty("generatedAt")
      expect(r).toHaveProperty("recommendation")
    })

    it("each dimension has correct shape", () => {
      const r = generateScorecard(fullHealthy())
      for (const d of r.dimensions) {
        expect(d).toHaveProperty("id")
        expect(d).toHaveProperty("name")
        expect(d).toHaveProperty("score")
        expect(d).toHaveProperty("grade")
        expect(d).toHaveProperty("status")
        expect(d).toHaveProperty("details")
        expect(d).toHaveProperty("checks")
        expect(d.checks.length).toBeGreaterThan(0)
        for (const c of d.checks) {
          expect(c).toHaveProperty("name")
          expect(c).toHaveProperty("passed")
          expect(c).toHaveProperty("value")
          expect(c).toHaveProperty("threshold")
        }
      }
    })
  })
})
