/**
 * POST /api/track — Lightweight event tracking for SPUD funnel metrics.
 *
 * Accepts { event, data } and logs to stdout as structured JSON.
 * Non-blocking, fire-and-forget from client. Always returns 200.
 *
 * Allowed events: lead_created, form_started, demo_requested
 */

import { NextRequest, NextResponse } from "next/server"
import { log } from "@/lib/logger"

const ALLOWED_EVENTS = new Set([
  "lead_created",
  "form_started",
  "demo_requested",
])

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const event = typeof body["event"] === "string" ? body["event"] : null

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false, error: "unknown event" }, { status: 400 })
    }

    const data = typeof body["data"] === "object" && body["data"] !== null
      ? body["data"] as Record<string, unknown>
      : {}

    log("info", `spud.${event}`, data)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
