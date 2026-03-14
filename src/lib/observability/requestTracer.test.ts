/**
 * M9: Request Tracing — Tests
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  startTrace,
  addSpan,
  endTrace,
  getTrace,
  getRecentTraces,
  getTraceStats,
  resetTracer,
} from "./requestTracer"

// ── Setup ────────────────────────────────────────────────

beforeEach(() => {
  resetTracer()
  vi.useFakeTimers({ now: new Date("2026-03-10T12:00:00Z") })
})

afterEach(() => {
  vi.useRealTimers()
})

// ── startTrace ───────────────────────────────────────────

describe("requestTracer", () => {
  describe("startTrace", () => {
    it("generates a request ID when none provided", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      expect(id).toMatch(/^req-/)
      expect(id.length).toBeGreaterThan(10)
    })

    it("reuses incoming x-request-id", () => {
      const id = startTrace({
        method: "GET",
        path: "/api/events",
        incomingId: "external-123",
      })
      expect(id).toBe("external-123")
    })

    it("creates active trace retrievable by getTrace", () => {
      const id = startTrace({ method: "POST", path: "/api/leads" })
      const trace = getTrace(id)
      expect(trace).toBeDefined()
      expect(trace!.method).toBe("POST")
      expect(trace!.path).toBe("/api/leads")
      expect(trace!.status).toBe("active")
    })

    it("normalizes method to uppercase", () => {
      const id = startTrace({ method: "post", path: "/api/leads" })
      expect(getTrace(id)!.method).toBe("POST")
    })

    it("supports parentId for sub-request correlation", () => {
      const parentId = startTrace({ method: "GET", path: "/api/events" })
      const childId = startTrace({
        method: "GET",
        path: "/api/db-query",
        parentId,
      })
      const child = getTrace(childId)
      expect(child!.parentId).toBe(parentId)
    })

    it("supports initial metadata", () => {
      const id = startTrace({
        method: "GET",
        path: "/api/events",
        metadata: { userId: "u-1", source: "web" },
      })
      const trace = getTrace(id)
      expect(trace!.metadata).toEqual({ userId: "u-1", source: "web" })
    })
  })

  // ── addSpan ──────────────────────────────────────────────

  describe("addSpan", () => {
    it("adds a span to an active trace", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      const endSpan = addSpan(id, { name: "db_query" })
      vi.advanceTimersByTime(50)
      endSpan()

      const trace = getTrace(id)
      expect(trace!.spans).toHaveLength(1)
      expect(trace!.spans[0]!.name).toBe("db_query")
      expect(trace!.spans[0]!.durationMs).toBe(50)
    })

    it("supports span metadata", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      const endSpan = addSpan(id, {
        name: "external_api",
        metadata: { url: "https://api.example.com" },
      })
      endSpan()

      expect(getTrace(id)!.spans[0]!.metadata).toEqual({
        url: "https://api.example.com",
      })
    })

    it("returns noop for non-existent trace", () => {
      const endSpan = addSpan("non-existent", { name: "db_query" })
      expect(() => endSpan()).not.toThrow()
    })

    it("caps spans per trace at MAX_SPANS_PER_TRACE", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      for (let i = 0; i < 25; i++) {
        const end = addSpan(id, { name: `span-${i}` })
        end()
      }
      expect(getTrace(id)!.spans.length).toBeLessThanOrEqual(20)
    })

    it("supports multiple concurrent spans", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      const endDb = addSpan(id, { name: "db_query" })
      vi.advanceTimersByTime(20)
      const endCache = addSpan(id, { name: "cache_check" })
      vi.advanceTimersByTime(30)
      endCache()
      vi.advanceTimersByTime(50)
      endDb()

      const spans = getTrace(id)!.spans
      expect(spans).toHaveLength(2)
      expect(spans[0]!.durationMs).toBe(100) // db: 20+30+50
      expect(spans[1]!.durationMs).toBe(30)  // cache: 30
    })
  })

  // ── endTrace ─────────────────────────────────────────────

  describe("endTrace", () => {
    it("completes a trace with duration", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      vi.advanceTimersByTime(150)
      const entry = endTrace(id, { httpStatus: 200 })

      expect(entry).not.toBeNull()
      expect(entry!.status).toBe("completed")
      expect(entry!.durationMs).toBe(150)
      expect(entry!.httpStatus).toBe(200)
    })

    it("marks error traces", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})
      const id = startTrace({ method: "POST", path: "/api/leads" })
      vi.advanceTimersByTime(30)
      const entry = endTrace(id, { httpStatus: 500, error: true })

      expect(entry!.status).toBe("error")
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it("merges additional metadata on end", () => {
      const id = startTrace({
        method: "GET",
        path: "/api/events",
        metadata: { userId: "u-1" },
      })
      endTrace(id, { metadata: { responseSize: 1024 } })

      const trace = getTrace(id)
      expect(trace!.metadata).toEqual({ userId: "u-1", responseSize: 1024 })
    })

    it("returns null for non-existent trace", () => {
      expect(endTrace("non-existent")).toBeNull()
    })

    it("removes trace from active set", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      endTrace(id, { httpStatus: 200 })

      // Trace still findable in history but not active
      const trace = getTrace(id)
      expect(trace).toBeDefined()
      expect(trace!.status).toBe("completed")
    })

    it("logs slow requests (>2000ms) as structured JSON", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})
      const id = startTrace({ method: "GET", path: "/api/events" })
      vi.advanceTimersByTime(3000)
      endTrace(id, { httpStatus: 200 })

      expect(spy).toHaveBeenCalled()
      const log = JSON.parse(spy.mock.calls[0]![0] as string)
      expect(log.event).toBe("trace_slow")
      expect(log.durationMs).toBe(3000)
      spy.mockRestore()
    })

    it("does NOT log fast successful requests", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})
      const id = startTrace({ method: "GET", path: "/api/events" })
      vi.advanceTimersByTime(50)
      endTrace(id, { httpStatus: 200 })

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  // ── getRecentTraces ────────────────────────────────────

  describe("getRecentTraces", () => {
    it("returns completed traces", () => {
      const id1 = startTrace({ method: "GET", path: "/api/events" })
      endTrace(id1, { httpStatus: 200 })
      const id2 = startTrace({ method: "POST", path: "/api/leads" })
      endTrace(id2, { httpStatus: 201 })

      expect(getRecentTraces()).toHaveLength(2)
    })

    it("filters by status", () => {
      const id1 = startTrace({ method: "GET", path: "/api/events" })
      endTrace(id1, { httpStatus: 200 })
      const id2 = startTrace({ method: "POST", path: "/api/leads" })
      endTrace(id2, { httpStatus: 500, error: true })

      const errors = getRecentTraces({ status: "error" })
      expect(errors).toHaveLength(1)
      expect(errors[0]!.path).toBe("/api/leads")
    })

    it("filters by path substring", () => {
      const id1 = startTrace({ method: "GET", path: "/api/events" })
      endTrace(id1, { httpStatus: 200 })
      const id2 = startTrace({ method: "GET", path: "/api/admin/pool" })
      endTrace(id2, { httpStatus: 200 })

      expect(getRecentTraces({ path: "admin" })).toHaveLength(1)
    })

    it("filters by minimum duration", () => {
      const id1 = startTrace({ method: "GET", path: "/fast" })
      vi.advanceTimersByTime(50)
      endTrace(id1, { httpStatus: 200 })

      const id2 = startTrace({ method: "GET", path: "/slow" })
      vi.advanceTimersByTime(500)
      endTrace(id2, { httpStatus: 200 })

      expect(getRecentTraces({ minDurationMs: 200 })).toHaveLength(1)
    })

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        const id = startTrace({ method: "GET", path: `/api/item/${i}` })
        endTrace(id, { httpStatus: 200 })
      }
      expect(getRecentTraces({ limit: 3 })).toHaveLength(3)
    })
  })

  // ── Ring buffer ────────────────────────────────────────

  describe("ring buffer", () => {
    it("caps at MAX_TRACES (500)", () => {
      for (let i = 0; i < 520; i++) {
        const id = startTrace({ method: "GET", path: `/api/item/${i}` })
        vi.advanceTimersByTime(10)
        endTrace(id, { httpStatus: 200 })
      }
      expect(getRecentTraces({ limit: 600 }).length).toBeLessThanOrEqual(500)
    })
  })

  // ── getTraceStats ──────────────────────────────────────

  describe("getTraceStats", () => {
    it("returns zero stats when no traces", () => {
      const stats = getTraceStats()
      expect(stats.totalTraces).toBe(0)
      expect(stats.avgDurationMs).toBe(0)
      expect(stats.p95DurationMs).toBe(0)
    })

    it("computes correct durations", () => {
      for (let i = 1; i <= 10; i++) {
        const id = startTrace({ method: "GET", path: "/api/events" })
        vi.advanceTimersByTime(i * 100)
        endTrace(id, { httpStatus: 200 })
      }
      const stats = getTraceStats()
      expect(stats.totalTraces).toBe(10)
      expect(stats.completedTraces).toBe(10)
      expect(stats.errorTraces).toBe(0)
      // avg of 100..1000 = 550
      expect(stats.avgDurationMs).toBe(550)
      expect(stats.p95DurationMs).toBeGreaterThanOrEqual(900)
    })

    it("tracks active traces count", () => {
      startTrace({ method: "GET", path: "/api/events" })
      startTrace({ method: "POST", path: "/api/leads" })
      const stats = getTraceStats()
      expect(stats.activeTraces).toBe(2)
    })

    it("separates error and completed counts", () => {
      const id1 = startTrace({ method: "GET", path: "/api/events" })
      endTrace(id1, { httpStatus: 200 })
      const id2 = startTrace({ method: "POST", path: "/api/leads" })
      endTrace(id2, { httpStatus: 500, error: true })

      const stats = getTraceStats()
      expect(stats.completedTraces).toBe(1)
      expect(stats.errorTraces).toBe(1)
    })

    it("computes slowest paths", () => {
      for (let i = 0; i < 5; i++) {
        const id = startTrace({ method: "GET", path: "/api/slow" })
        vi.advanceTimersByTime(500)
        endTrace(id, { httpStatus: 200 })
      }
      for (let i = 0; i < 5; i++) {
        const id = startTrace({ method: "GET", path: "/api/fast" })
        vi.advanceTimersByTime(50)
        endTrace(id, { httpStatus: 200 })
      }

      const stats = getTraceStats()
      expect(stats.slowestPaths[0]!.path).toBe("/api/slow")
      expect(stats.slowestPaths[0]!.avgMs).toBe(500)
      expect(stats.slowestPaths[0]!.count).toBe(5)
    })

    it("includes collectedAt timestamp", () => {
      expect(getTraceStats().collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  // ── resetTracer ────────────────────────────────────────

  describe("resetTracer", () => {
    it("clears all state", () => {
      const id = startTrace({ method: "GET", path: "/api/events" })
      endTrace(id, { httpStatus: 200 })
      startTrace({ method: "POST", path: "/api/leads" }) // active

      resetTracer()

      expect(getRecentTraces()).toHaveLength(0)
      const stats = getTraceStats()
      expect(stats.totalTraces).toBe(0)
      expect(stats.activeTraces).toBe(0)
    })
  })

  // ── Structured logging ─────────────────────────────────

  describe("structured logging", () => {
    it("logs error traces with correct fields", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})
      const id = startTrace({ method: "POST", path: "/api/leads" })
      vi.advanceTimersByTime(100)
      endTrace(id, { httpStatus: 500, error: true })

      const log = JSON.parse(spy.mock.calls[0]![0] as string)
      expect(log.level).toBe("trace")
      expect(log.event).toBe("trace_error")
      expect(log.requestId).toBe(id)
      expect(log.method).toBe("POST")
      expect(log.path).toBe("/api/leads")
      expect(log.httpStatus).toBe(500)
      expect(log.durationMs).toBe(100)
      spy.mockRestore()
    })
  })
})
