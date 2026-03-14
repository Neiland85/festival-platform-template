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
      COUNT(leads.id)::int AS leads
    FROM events
    LEFT JOIN leads
      ON leads.event_id = events.id
    GROUP BY events.id
    ORDER BY leads DESC
  `)

  return NextResponse.json(result.rows)
})
