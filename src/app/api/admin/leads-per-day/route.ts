import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/adapters/db/pool"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"

export const GET = safeHandler(async (req: NextRequest) => {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const pool = getPool()

  const result = await pool.query(`
    SELECT
      DATE(created_at) as day,
      COUNT(*)::int as leads
    FROM leads
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY day
    ORDER BY day ASC
  `)

  return NextResponse.json(result.rows)
})
