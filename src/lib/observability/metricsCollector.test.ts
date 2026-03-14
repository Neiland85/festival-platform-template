/**
 * Tests para M1: Observability Middleware — Metrics Collector
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  recordRequest,
  getMetrics,
  resetMetrics,
} from "./metricsCollector"

describe("metricsCollector", () => {

  beforeEach(() => {
    resetMetrics()
  })

  describe("recordRequest", () => {

    it("registers a single request", () => {
      recordRequest("/api/v1/leads", 45, 200)

      const m = getMetrics()
      expect(m.totalRequests).toBe(1)
      expect(m.routes).toHaveLength(1)
      expect(m.routes[0]!.route).toBe("/api/v1/leads")
      expect(m.routes[0]!.requests).toBe(1)
    })

    it("accumulates multiple requests on same route", () => {
      recordRequest("/api/v1/leads", 10, 200)
      recordRequest("/api/v1/leads", 20, 200)
      recordRequest("/api/v1/leads", 30, 200)

      const m = getMetrics()
      expect(m.totalRequests).toBe(3)
      expect(m.routes[0]!.requests).toBe(3)
    })

    it("tracks separate routes independently", () => {
      recordRequest("/api/v1/leads", 10, 200)
      recordRequest("/api/admin/metrics", 50, 200)

      const m = getMetrics()
      expect(m.totalRequests).toBe(2)
      expect(m.routes).toHaveLength(2)
    })

    it("counts errors for 4xx and 5xx status codes", () => {
      recordRequest("/api/v1/leads", 10, 200)
      recordRequest("/api/v1/leads", 10, 400)
      recordRequest("/api/v1/leads", 10, 500)
      recordRequest("/api/v1/leads", 10, 503)

      const m = getMetrics()
      expect(m.totalErrors).toBe(3)
      expect(m.routes[0]!.errors).toBe(3)
      expect(m.routes[0]!.errorRate).toBe("75.0%")
    })

    it("does not count 2xx/3xx as errors", () => {
      recordRequest("/api/v1/leads", 10, 200)
      recordRequest("/api/v1/leads", 10, 201)
      recordRequest("/api/v1/leads", 10, 301)

      const m = getMetrics()
      expect(m.totalErrors).toBe(0)
    })

    it("tracks status code distribution", () => {
      recordRequest("/api/v1/leads", 10, 200)
      recordRequest("/api/v1/leads", 10, 200)
      recordRequest("/api/v1/leads", 10, 400)
      recordRequest("/api/v1/leads", 10, 500)

      const route = getMetrics().routes[0]!
      expect(route.statusCodes[200]).toBe(2)
      expect(route.statusCodes[400]).toBe(1)
      expect(route.statusCodes[500]).toBe(1)
    })

  })

  describe("latency tracking", () => {

    it("calculates min and max", () => {
      recordRequest("/test", 5, 200)
      recordRequest("/test", 100, 200)
      recordRequest("/test", 50, 200)

      const route = getMetrics().routes[0]!
      expect(route.minMs).toBe(5)
      expect(route.maxMs).toBe(100)
    })

    it("calculates average", () => {
      recordRequest("/test", 10, 200)
      recordRequest("/test", 20, 200)
      recordRequest("/test", 30, 200)

      const route = getMetrics().routes[0]!
      expect(route.avgMs).toBe("20.0")
    })

    it("calculates percentiles", () => {
      // Insert 100 requests with latencies 1-100ms
      for (let i = 1; i <= 100; i++) {
        recordRequest("/test", i, 200)
      }

      const route = getMetrics().routes[0]!
      expect(route.p50Ms).toBe(50)
      expect(route.p95Ms).toBe(95)
      expect(route.p99Ms).toBe(99)
    })

    it("handles single request percentiles", () => {
      recordRequest("/test", 42, 200)

      const route = getMetrics().routes[0]!
      expect(route.p50Ms).toBe(42)
      expect(route.p95Ms).toBe(42)
      expect(route.p99Ms).toBe(42)
    })

  })

  describe("getMetrics", () => {

    it("returns empty state when no requests recorded", () => {
      const m = getMetrics()
      expect(m.totalRequests).toBe(0)
      expect(m.totalErrors).toBe(0)
      expect(m.globalErrorRate).toBe("0%")
      expect(m.routes).toHaveLength(0)
      expect(m.uptime).toBeGreaterThan(0)
    })

    it("sorts routes by request count descending", () => {
      recordRequest("/low", 10, 200)
      recordRequest("/high", 10, 200)
      recordRequest("/high", 10, 200)
      recordRequest("/high", 10, 200)
      recordRequest("/mid", 10, 200)
      recordRequest("/mid", 10, 200)

      const routes = getMetrics().routes
      expect(routes[0]!.route).toBe("/high")
      expect(routes[1]!.route).toBe("/mid")
      expect(routes[2]!.route).toBe("/low")
    })

    it("includes uptime information", () => {
      const m = getMetrics()
      expect(m.uptime).toBeGreaterThan(0)
      expect(m.uptimeHuman).toMatch(/\d+h \d+m \d+s/)
    })

    it("includes collectedAt timestamp", () => {
      const m = getMetrics()
      expect(m.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("includes lastRequestAt per route", () => {
      recordRequest("/test", 10, 200)
      const route = getMetrics().routes[0]!
      expect(route.lastRequestAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

  })

  describe("resetMetrics", () => {

    it("clears all data", () => {
      recordRequest("/test", 10, 200)
      recordRequest("/test2", 20, 500)

      resetMetrics()

      const m = getMetrics()
      expect(m.totalRequests).toBe(0)
      expect(m.routes).toHaveLength(0)
    })

  })

  describe("circular buffer", () => {

    it("maintains max sample size", () => {
      // Record 600 requests (buffer max is 500)
      for (let i = 0; i < 600; i++) {
        recordRequest("/test", i, 200)
      }

      // Percentiles should still work correctly
      const route = getMetrics().routes[0]!
      expect(route.requests).toBe(600)
      // P50 of 100-599 range = ~350
      expect(route.p50Ms).toBeGreaterThan(200)
      expect(route.p50Ms).toBeLessThan(500)
    })

  })

  describe("high load scenario", () => {

    it("handles 10000 requests across 20 routes", () => {
      for (let i = 0; i < 10000; i++) {
        const route = `/api/route-${i % 20}`
        const latency = Math.random() * 200
        const status = Math.random() > 0.95 ? 500 : 200
        recordRequest(route, latency, status)
      }

      const m = getMetrics()
      expect(m.totalRequests).toBe(10000)
      expect(m.routes).toHaveLength(20)
      // Each route should have ~500 requests
      for (const r of m.routes) {
        expect(r.requests).toBe(500)
      }
    })

  })

})
