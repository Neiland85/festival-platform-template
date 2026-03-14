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
      events.id,
      events.title,
      events.capacity,
      COUNT(leads.id)::int AS leads_last_hour
    FROM events
    LEFT JOIN leads
      ON leads.event_id = events.id
      AND leads.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY events.id
    ORDER BY leads_last_hour DESC
    LIMIT 1
  `)

  const event = result.rows[0]

  if (!event) {
    return NextResponse.json(null)
  }

  const percent = event.capacity > 0
    ? Math.min(Math.round((event.leads_last_hour / event.capacity) * 100), 100)
    : 0

  return NextResponse.json({
    ...event,
    percent,
  })
})
