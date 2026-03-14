import { NextResponse } from "next/server"
import { getPool } from "@/adapters/db/pool"
import { problem } from "@/lib/problem"
import * as Sentry from "@sentry/nextjs"

export async function GET() {
  const instance = "/api/readyz"

  try {
    const pool = getPool()
    await pool.query("SELECT 1")

    return NextResponse.json({
      status: "ready",
      db: "connected",
    })
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development"
    const message = error instanceof Error ? error.message : String(error)
    const name = error instanceof Error ? error.name : "UnknownError"

    console.error("readyz_db_check_failed", { name, message })
    Sentry.captureException(error, { tags: { route: "/api/readyz" } })

    return problem({
      type: "https://www.solarisnerja.com/problems/dependency",
      title: "Service Unavailable",
      status: 503,
      detail: isDev ? `Database not ready: ${name}: ${message}` : "Database not ready",
      instance,
    })
  }
}
