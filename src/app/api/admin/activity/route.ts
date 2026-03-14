import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/adapters/db/pool"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"

export const GET = safeHandler(async (req: NextRequest) => {
  if (!requireAdmin(req)) {
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
