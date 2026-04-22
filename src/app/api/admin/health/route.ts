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

  const leadsTotal = await pool.query(`
    SELECT COUNT(*)::int as total
    FROM leads
  `)

  const last24h = await pool.query(`
    SELECT COUNT(*)::int as total
    FROM leads
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `)

  const capacity = await pool.query(`
    SELECT SUM(capacity)::int as total
    FROM events
    WHERE active = true
  `)

  const totalLeads = leadsTotal.rows[0]?.total ?? 0
  const lastDay = last24h.rows[0]?.total ?? 0
  const totalCapacity = capacity.rows[0]?.total ?? 5000

  const occupancy = totalLeads / totalCapacity

  let score = "LOW"
  if (occupancy > 0.7 || lastDay > 100) score = "STRONG"
  else if (occupancy > 0.4 || lastDay > 40) score = "GROWING"

  return NextResponse.json({
    totalLeads,
    last24h: lastDay,
    capacity: totalCapacity,
    occupancy,
    momentum: score,
  })
})
