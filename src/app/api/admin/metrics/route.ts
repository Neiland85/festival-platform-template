import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/adapters/db/pool"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { overloadGuard } from "@/lib/security/overload"
import { _getClientIp } from "@/lib/ip"
import { safeHandler } from "@/lib/api/safeHandler"

export const GET = safeHandler(async (req: NextRequest) => {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const ip = _getClientIp(req)

  if (!overloadGuard(ip)) {
    return NextResponse.json({ error: "server overloaded" }, { status: 503 })
  }

  const pool = getPool()

  const leadsTotal = await pool.query(`
    SELECT COUNT(*)::int as total
    FROM leads
  `)

  const events = await pool.query(`
    SELECT events.id,
           events.title,
           COUNT(leads.id)::int as leads
    FROM events
    LEFT JOIN leads ON leads.event_id = events.id
    GROUP BY events.id
    ORDER BY leads DESC
  `)

  return NextResponse.json({
    leadsTotal: leadsTotal.rows[0]?.total ?? 0,
    events: events.rows,
  })
})
