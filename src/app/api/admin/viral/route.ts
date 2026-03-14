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

      COUNT(CASE WHEN leads.created_at > NOW() - INTERVAL '1 hour' THEN 1 END)::int AS leads_last_hour,
      COUNT(CASE WHEN leads.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS leads_last_day

    FROM events
    LEFT JOIN leads
      ON leads.event_id = events.id

    GROUP BY events.id
  `)

  const viral = result.rows.find((e) => {
    const avgPerHour = (e.leads_last_day || 0) / 24
    return e.leads_last_hour > avgPerHour * 3 && e.leads_last_hour > 5
  })

  if (!viral) {
    return NextResponse.json(null)
  }

  return NextResponse.json({
    title: viral.title,
    leads_last_hour: viral.leads_last_hour,
    leads_last_day: viral.leads_last_day,
  })
})
