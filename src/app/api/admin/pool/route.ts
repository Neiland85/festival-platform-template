/**
 * GET /api/admin/pool
 *
 * Expone salud del pool de conexiones PostgreSQL.
 * Protegido con requireAdmin.
 *
 * Response:
 * {
 *   level: "HEALTHY"|"PRESSURE"|"EXHAUSTED"|"ERROR",
 *   stats: { total, idle, active, waiting, max },
 *   utilization, waitingAlert, errors, alerts: [...]
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { getPoolHealth } from "@/lib/observability/poolMonitor"

export async function GET(req: NextRequest) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { getPool } = await import("@/adapters/db/pool")

  if (!(await requireAdmin(req))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 403 }
    )
  }

  try {
    const pool = getPool()
    const health = getPoolHealth(pool)

    return NextResponse.json(health, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json(
      { error: "pool_unavailable", message: "Database pool not initialized" },
      { status: 503 }
    )
  }
}
