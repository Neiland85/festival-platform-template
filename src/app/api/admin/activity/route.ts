import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"

export const GET = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { getPool } = await import("@/adapters/db/pool")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const pool = getPool()

  const lastHour = await pool.query(`
    SELECT COUNT(*)::int as total
    FROM leads
    WHERE created_at > NOW() - INTERVAL '1 hour'
  `)

  const lastDay = await pool.query(`
    SELECT COUNT(*)::int as total
    FROM leads
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `)

  return NextResponse.json({
    lastHour: lastHour.rows[0]?.total ?? 0,
    last24h: lastDay.rows[0]?.total ?? 0,
  })
})
