/**
 * GET /api/admin/observability
 *
 * Expone métricas de latencia, throughput y error rate por ruta.
 * Protegido con requireAdmin.
 *
 * Response format:
 * {
 *   uptime, uptimeHuman, totalRequests, totalErrors, globalErrorRate,
 *   routes: [{ route, requests, errors, errorRate, avgMs, p50Ms, p95Ms, p99Ms, ... }],
 *   collectedAt
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { getMetrics } from "@/lib/observability/metricsCollector"

export async function GET(req: NextRequest) {

  if (!requireAdmin(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 403 }
    )
  }

  const metrics = getMetrics()

  return NextResponse.json(metrics, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
