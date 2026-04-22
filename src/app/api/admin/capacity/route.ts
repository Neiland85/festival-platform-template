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
