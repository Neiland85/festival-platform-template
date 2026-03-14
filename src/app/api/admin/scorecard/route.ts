/**
 * M10: Infrastructure Safety Scorecard — Admin Endpoint
 *
 * GET /api/admin/scorecard
 * Returns full infrastructure safety scorecard.
 *
 * Collects live data from M1-M9 modules and feeds it
 * into the scorecard generator.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { generateScorecard, type ScorecardInput } from "@/lib/observability/safetyScorecard"
import { getMetrics } from "@/lib/observability/metricsCollector"
import { checkQueueHealth } from "@/lib/observability/queueAlert"
import { queueSize } from "@/lib/security/burstQueue"
import { getTraceStats } from "@/lib/observability/requestTracer"
import { correlate } from "@/lib/observability/correlationEngine"
import { getAuditStats } from "@/lib/observability/auditLog"
import { swrCache } from "@/lib/cache/swr"

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Collect data from each module ─────────────────────
  const metrics = getMetrics()
  const qHealth = checkQueueHealth(queueSize())
  const traceStats = getTraceStats()
  const corrReport = correlate()
  const auditStats = getAuditStats()
  const cacheStats = swrCache.getStats()

  const input: ScorecardInput = {
    metrics: {
      totalRequests: metrics.totalRequests,
      totalErrors: metrics.totalErrors,
      routes: metrics.routes.map(r => ({
        route: r.route,
        p95: r.p95Ms,
        p99: r.p99Ms,
        errorRate: r.errorRate,
        requests: r.requests,
      })),
    },
    queue: {
      level: qHealth.level,
      currentSize: qHealth.size,
      alerts: qHealth.alerts.map(a => ({ type: a.code })),
    },
    cache: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      staleHits: cacheStats.staleHits,
      size: cacheStats.size,
    },
    tracing: {
      totalTraces: traceStats.totalTraces,
      activeTraces: traceStats.activeTraces,
      errorTraces: traceStats.errorTraces,
      avgDurationMs: traceStats.avgDurationMs,
      p95DurationMs: traceStats.p95DurationMs,
    },
    correlation: {
      overallScore: corrReport.overallScore,
      overallLevel: corrReport.overallLevel,
      alerts: corrReport.alerts.map(a => ({ severity: a.severity })),
      trend: corrReport.trend,
    },
    audit: {
      totalEntries: auditStats.total,
      actionBreakdown: auditStats.actionCounts,
    },
  }

  const scorecard = generateScorecard(input)

  return NextResponse.json(scorecard, {
    headers: { "Cache-Control": "no-store" },
  })
}
