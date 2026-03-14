import { NextRequest, NextResponse } from "next/server"
import { eventUpdateSchema } from "@/contracts/schemas/event.schema"
import { applyEventUpdate } from "@/domain/events/update-event"
import { findEventById, updateEvent, deleteEvent } from "@/adapters/db/event-repository"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { problem } from "@/lib/problem"
import { log } from "@/lib/logger"
import * as Sentry from "@sentry/nextjs"
import { audit } from "@/lib/observability/auditLog"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const instance = `/api/v1/events/${id}`
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const event = await findEventById(id)

    if (!event) {
      return problem({
        type: "https://www.solarisnerja.com/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: `Event ${id} not found`,
        instance,
      })
    }

    return NextResponse.json({ data: event })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log("error", "event_get_error", { requestId, error: errMsg })
    Sentry.captureException(error, { tags: { route: `/api/v1/events/${id}`, method: "GET" } })

    return problem({
      type: "https://www.solarisnerja.com/problems/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected error",
      instance,
    })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const { id } = await context.params
  const instance = `/api/v1/events/${id}`
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const body: unknown = await req.json()
    const parsed = eventUpdateSchema.safeParse(body)

    if (!parsed.success) {
      log("warn", "event_update_validation_failed", { requestId, errors: parsed.error.issues })
      return problem({
        type: "https://www.solarisnerja.com/problems/validation",
        title: "Validation error",
        status: 400,
        detail: "Invalid payload",
        instance,
      })
    }

    const existing = await findEventById(id)
    if (!existing) {
      return problem({
        type: "https://www.solarisnerja.com/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: `Event ${id} not found`,
        instance,
      })
    }

    const updated = applyEventUpdate(existing, parsed.data)
    await updateEvent(updated)

    log("info", "event_updated", { requestId, eventId: id })
    audit({ action: "event.update", req, resource: id })

    return NextResponse.json({ data: updated })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log("error", "event_update_error", { requestId, error: errMsg })
    Sentry.captureException(error, { tags: { route: `/api/v1/events/${id}`, method: "PATCH" } })

    return problem({
      type: "https://www.solarisnerja.com/problems/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected error",
      instance,
    })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const { id } = await context.params
  const instance = `/api/v1/events/${id}`
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const deleted = await deleteEvent(id)

    if (!deleted) {
      return problem({
        type: "https://www.solarisnerja.com/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: `Event ${id} not found`,
        instance,
      })
    }

    log("info", "event_deleted", { requestId, eventId: id })
    audit({ action: "event.delete", req, resource: id })

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log("error", "event_delete_error", { requestId, error: errMsg })
    Sentry.captureException(error, { tags: { route: `/api/v1/events/${id}`, method: "DELETE" } })

    return problem({
      type: "https://www.solarisnerja.com/problems/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected error",
      instance,
    })
  }
}
