import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/adapters/db/pool"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"

export const GET = safeHandler(async (req: NextRequest) => {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const pool = getPool()

  const db = await pool.query("SELECT 1")

  return NextResponse.json({
    status: "ok",
    database: db.rowCount === 1 ? "connected" : "error",
    timestamp: new Date().toISOString(),
  })
})
