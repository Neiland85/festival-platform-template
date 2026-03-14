import { NextRequest, NextResponse } from "next/server"
import { eventCreateSchema } from "@/contracts/schemas/event.schema"
import { createEvent } from "@/domain/events/create-event"
import { findAllEvents, saveEvent } from "@/adapters/db/event-repository"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { problem } from "@/lib/problem"
import { log } from "@/lib/logger"
import * as Sentry from "@sentry/nextjs"
import { audit } from "@/lib/observability/auditLog"

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const events = await findAllEvents()

    return NextResponse.json({ data: events }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log("error", "events_list_error", { requestId, error: errMsg })
    Sentry.captureException(error, { tags: { route: "/api/v1/events", method: "GET" } })

    return problem({
      type: "https://www.solarisnerja.com/problems/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected error",
      instance: "/api/v1/events",
    })
  }
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const instance = "/api/v1/events"
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const body: unknown = await req.json()
    const parsed = eventCreateSchema.safeParse(body)

    if (!parsed.success) {
      log("warn", "event_validation_failed", { requestId, errors: parsed.error.issues })
      return problem({
        type: "https://www.solarisnerja.com/problems/validation",
        title: "Validation error",
        status: 400,
        detail: "Invalid payload",
        instance,
      })
    }

    const event = createEvent({
      title: parsed.data.title,
      description: parsed.data.description,
      highlight: parsed.data.highlight,
      ticketUrl: parsed.data.ticketUrl,
    })

    await saveEvent(event)

    log("info", "event_created", { requestId, eventId: event.id })
    audit({ action: "event.create", req, resource: event.id, details: { title: parsed.data.title } })

    return NextResponse.json({ data: event }, { status: 201 })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log("error", "event_create_error", { requestId, error: errMsg })
    Sentry.captureException(error, { tags: { route: "/api/v1/events", method: "POST" } })

    return problem({
      type: "https://www.solarisnerja.com/problems/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected error",
      instance,
    })
  }
}
