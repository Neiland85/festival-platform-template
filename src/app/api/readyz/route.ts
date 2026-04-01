import { NextResponse } from "next/server"
import { problem } from "@/lib/problem"
import { captureException } from "@sentry/nextjs"

export async function GET() {
  // ── Preview: no DB available, return degraded status ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ status: "ready", db: "skipped (preview)", preview: true })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { getPool } = await import("@/adapters/db/pool")
  const { serverEnv } = await import("@/lib/env")

  const instance = "/api/readyz"

  try {
    const pool = getPool()
    await pool.query("SELECT 1")

    return NextResponse.json({
      status: "ready",
      db: "connected",
    })
  } catch (error) {
    const isDev = serverEnv.NODE_ENV === "development"
    const message = error instanceof Error ? error.message : String(error)
    const name = error instanceof Error ? error.name : "UnknownError"

    console.error("readyz_db_check_failed", { name, message })
    captureException(error, { tags: { route: "/api/readyz" } })

    return problem({
      type: "https://www.your-festival.com/problems/dependency",
      title: "Service Unavailable",
      status: 503,
      detail: isDev ? `Database not ready: ${name}: ${message}` : "Database not ready",
      instance,
    })
  }
}
