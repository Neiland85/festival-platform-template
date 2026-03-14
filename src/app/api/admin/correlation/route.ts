/**
 * M8: Analytics Correlation Engine — Admin Endpoint
 *
 * GET /api/admin/correlation
 * Returns unified health report with cross-signal correlations.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { correlate, getAlerts, getTimeline } from "@/lib/observability/correlationEngine"

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get("mode") ?? "full"

  if (mode === "alerts") {
    return NextResponse.json({ alerts: getAlerts() }, {
      headers: { "Cache-Control": "no-store" },
    })
  }

  if (mode === "timeline") {
    return NextResponse.json({ timeline: getTimeline() }, {
      headers: { "Cache-Control": "no-store" },
    })
  }

  // Full correlation report
  const report = correlate()
  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  })
}
