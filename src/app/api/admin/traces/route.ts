/**
 * M9: Request Tracing — Admin Endpoint
 *
 * GET /api/admin/traces
 * Returns recent traces and tracing statistics.
 *
 * Query params:
 *   mode=stats    → tracing statistics only
 *   mode=traces   → recent traces (default)
 *   status=error  → filter by status
 *   path=/api/... → filter by path substring
 *   limit=50      → max results
 *   minMs=200     → minimum duration filter
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { getRecentTraces, getTraceStats } from "@/lib/observability/requestTracer"

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get("mode") ?? "traces"

  if (mode === "stats") {
    return NextResponse.json(getTraceStats(), {
      headers: { "Cache-Control": "no-store" },
    })
  }

  const status = url.searchParams.get("status") as "active" | "completed" | "error" | null
  const path = url.searchParams.get("path")
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10)
  const minMs = url.searchParams.get("minMs")
    ? parseInt(url.searchParams.get("minMs")!, 10)
    : undefined

  const traces = getRecentTraces({
    limit: isNaN(limit) ? 50 : limit,
    ...(status ? { status } : {}),
    ...(path ? { path } : {}),
    ...(minMs ? { minDurationMs: minMs } : {}),
  })

  return NextResponse.json({ traces, count: traces.length }, {
    headers: { "Cache-Control": "no-store" },
  })
}
