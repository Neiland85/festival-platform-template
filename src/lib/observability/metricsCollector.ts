/**
 * M1: Observability Middleware — Metrics Collector
 *
 * Módulo independiente de recolección de métricas por ruta.
 * Mide latencia (P50/P95/P99), throughput, error rate y status codes.
 *
 * NO modifica rutas existentes. Se integra como wrapper opcional
 * via withMetrics(handler) o se consulta via /api/admin/observability.
 *
 * In-memory store — se resetea en cold start (aceptable para serverless).
 */

import { NextRequest, NextResponse } from "next/server"

// ── Types ───────────────────────────────────────────────

type RouteMetrics = {
  route: string
  count: number
  errors: number
  totalMs: number
  minMs: number
  maxMs: number
  latencies: number[] // circular buffer for percentile calc
  statusCodes: Map<number, number>
  lastRequestAt: number
}

type MetricsSnapshot = {
  route: string
  requests: number
  errors: number
  errorRate: string
  avgMs: string
  minMs: number
  maxMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  statusCodes: Record<number, number>
  requestsPerMinute: string
  lastRequestAt: string
}

type GlobalSnapshot = {
  uptime: number
  uptimeHuman: string
  totalRequests: number
  totalErrors: number
  globalErrorRate: string
  routes: MetricsSnapshot[]
  collectedAt: string
}

// ── Config ──────────────────────────────────────────────

const MAX_LATENCY_SAMPLES = 500
const STARTUP = Date.now()

// ── Store ───────────────────────────────────────────────

const store = new Map<string, RouteMetrics>()

// ── Internal helpers ────────────────────────────────────

function getOrCreate(route: string): RouteMetrics {
  let m = store.get(route)
  if (!m) {
    m = {
      route,
      count: 0,
      errors: 0,
      totalMs: 0,
      minMs: Infinity,
      maxMs: 0,
      latencies: [],
      statusCodes: new Map(),
      lastRequestAt: 0,
    }
    store.set(route, m)
  }
  return m
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)] ?? 0
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h ${m}m ${sec}s`
}

// ── Public API ──────────────────────────────────────────

/**
 * Registra una request completada con su latencia y status code.
 * Llamar al final de cada handler o desde withMetrics().
 */
export function recordRequest(
  route: string,
  durationMs: number,
  statusCode: number
): void {
  const m = getOrCreate(route)

  m.count++
  m.totalMs += durationMs
  m.lastRequestAt = Date.now()

  if (durationMs < m.minMs) m.minMs = durationMs
  if (durationMs > m.maxMs) m.maxMs = durationMs

  // Circular buffer para latencias
  if (m.latencies.length >= MAX_LATENCY_SAMPLES) {
    m.latencies.shift()
  }
  m.latencies.push(durationMs)

  // Status codes
  const prev = m.statusCodes.get(statusCode) ?? 0
  m.statusCodes.set(statusCode, prev + 1)

  // Errors: 4xx y 5xx
  if (statusCode >= 400) {
    m.errors++
  }

  // Structured JSON log para errores y requests lentas (>2s)
  // Compatible con Vercel log drain, CloudWatch, Loki, Datadog
  if (statusCode >= 500 || durationMs > 2000) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? "error" : "warn",
      event: "metrics.request",
      route,
      statusCode,
      durationMs: Math.round(durationMs),
      totalRequests: m.count,
      errorRate: m.count > 0 ? ((m.errors / m.count) * 100).toFixed(1) + "%" : "0%",
    }))
  }
}

/**
 * Devuelve snapshot completo de métricas para todas las rutas.
 */
export function getMetrics(): GlobalSnapshot {
  const now = Date.now()
  const uptime = now - STARTUP

  let totalRequests = 0
  let totalErrors = 0
  const routes: MetricsSnapshot[] = []

  for (const m of store.values()) {
    totalRequests += m.count
    totalErrors += m.errors

    const sorted = [...m.latencies].sort((a, b) => a - b)
    const elapsed = (now - STARTUP) / 60000 // minutes since start

    const statusCodes: Record<number, number> = {}
    for (const [code, count] of m.statusCodes) {
      statusCodes[code] = count
    }

    routes.push({
      route: m.route,
      requests: m.count,
      errors: m.errors,
      errorRate: m.count > 0 ? ((m.errors / m.count) * 100).toFixed(1) + "%" : "0%",
      avgMs: m.count > 0 ? (m.totalMs / m.count).toFixed(1) : "0",
      minMs: m.minMs === Infinity ? 0 : Math.round(m.minMs),
      maxMs: Math.round(m.maxMs),
      p50Ms: Math.round(percentile(sorted, 50)),
      p95Ms: Math.round(percentile(sorted, 95)),
      p99Ms: Math.round(percentile(sorted, 99)),
      statusCodes,
      requestsPerMinute: elapsed > 0 ? (m.count / elapsed).toFixed(2) : "0",
      lastRequestAt: m.lastRequestAt > 0
        ? new Date(m.lastRequestAt).toISOString()
        : "never",
    })
  }

  // Sort by request count desc
  routes.sort((a, b) => b.requests - a.requests)

  return {
    uptime,
    uptimeHuman: formatUptime(uptime),
    totalRequests,
    totalErrors,
    globalErrorRate:
      totalRequests > 0
        ? ((totalErrors / totalRequests) * 100).toFixed(1) + "%"
        : "0%",
    routes,
    collectedAt: new Date().toISOString(),
  }
}

/**
 * Emite snapshot completo de métricas a stdout como structured JSON.
 * Llamar periódicamente o antes de shutdown para persistir en log drain.
 * Compatible con Vercel log drain, CloudWatch, Loki, Datadog.
 */
export function flushMetricsToStdout(): void {
  if (store.size === 0) return

  const snapshot = getMetrics()
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "metrics.flush",
    uptime: snapshot.uptime,
    totalRequests: snapshot.totalRequests,
    totalErrors: snapshot.totalErrors,
    globalErrorRate: snapshot.globalErrorRate,
    routeCount: snapshot.routes.length,
    routes: snapshot.routes.map((r) => ({
      route: r.route,
      requests: r.requests,
      errors: r.errors,
      errorRate: r.errorRate,
      avgMs: r.avgMs,
      p95Ms: r.p95Ms,
      p99Ms: r.p99Ms,
    })),
  }))
}

/**
 * Resetea todas las métricas. Útil para tests.
 */
export function resetMetrics(): void {
  store.clear()
}

/**
 * HOF que envuelve un route handler de Next.js App Router.
 * Mide latencia y registra métricas automáticamente.
 *
 * Uso:
 *   import { withMetrics } from "@/lib/observability/metricsCollector"
 *   const handler = async (req: NextRequest) => { ... }
 *   export const GET = withMetrics("/api/admin/metrics", handler)
 */
export function withMetrics(
  route: string,
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = performance.now()
    let status = 500

    try {
      const response = await handler(req)
      status = response.status
      return response
    } catch (err) {
      status = 500
      throw err
    } finally {
      const duration = performance.now() - start
      recordRequest(route, duration, status)
    }
  }
}
