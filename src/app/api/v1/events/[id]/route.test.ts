import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, PATCH, DELETE } from "./route"
import { createSession, _clearAllSessions } from "@/lib/auth/sessionStore"

// ── Mock DB ─────────────────────────────────────────

import type { Event as AppEvent } from "@/domain/events/types"

const storedEvent: AppEvent = {
  id: "evt-42",
  title: "Flamenco Night",
  description: "Live flamenco",
  highlight: "Best in Nerja",
  ticketUrl: "https://tickets.example.com/42",
  active: true,
  createdAt: new Date("2026-01-15"),
}

const findEventById = vi.fn()
const updateEvent = vi.fn()
const deleteEventMock = vi.fn()

vi.mock("@/adapters/db/event-repository", () => ({
  findEventById: (...args: unknown[]) => findEventById(...args),
  updateEvent: (...args: unknown[]) => updateEvent(...args),
  deleteEvent: (...args: unknown[]) => deleteEventMock(...args),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

beforeEach(() => {
  findEventById.mockReset()
  updateEvent.mockReset()
  deleteEventMock.mockReset()

  findEventById.mockImplementation(async (id: string) =>
    id === "evt-42" ? { ...storedEvent } : null
  )
  updateEvent.mockResolvedValue(undefined)
  deleteEventMock.mockImplementation(async (id: string) => id === "evt-42")
})

// ── Helpers ─────────────────────────────────────────

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeGetReq(): NextRequest {
  return new NextRequest("https://example.com/api/v1/events/evt-42", { method: "GET" })
}

function makePatchReq(body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["cookie"] = `admin_session=${token}`
  return new NextRequest("https://example.com/api/v1/events/evt-42", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
}

function makeDeleteReq(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers["cookie"] = `admin_session=${token}`
  return new NextRequest("https://example.com/api/v1/events/evt-42", {
    method: "DELETE",
    headers,
  })
}

// ── Tests ───────────────────────────────────────────

describe("GET /api/v1/events/[id]", () => {
  it("returns event data when found", async () => {
    const res = await GET(makeGetReq(), makeContext("evt-42"))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data.title).toBe("Flamenco Night")
  })

  it("returns 404 when event not found", async () => {
    const res = await GET(makeGetReq(), makeContext("nonexistent"))
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/v1/events/[id]", () => {
  beforeEach(() => {
    _clearAllSessions()
    findEventById.mockClear()
    updateEvent.mockClear()
  })

  it("returns 403 without admin session", async () => {
    const res = await PATCH(makePatchReq({ title: "Updated" }), makeContext("evt-42"))
    expect(res.status).toBe(403)
  })

  it("updates event with valid payload", async () => {
    const session = createSession()
    const res = await PATCH(
      makePatchReq({ title: "Updated Flamenco" }, session.token),
      makeContext("evt-42")
    )
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data.title).toBe("Updated Flamenco")
    expect(updateEvent).toHaveBeenCalledOnce()
  })

  it("returns 404 when event not found", async () => {
    const session = createSession()
    const res = await PATCH(
      makePatchReq({ title: "Nope" }, session.token),
      makeContext("nonexistent")
    )
    expect(res.status).toBe(404)
  })

  it("returns 400 on invalid payload", async () => {
    const session = createSession()
    const res = await PATCH(
      makePatchReq({ title: "x".repeat(201) }, session.token),
      makeContext("evt-42")
    )
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/v1/events/[id]", () => {
  beforeEach(() => {
    _clearAllSessions()
    deleteEventMock.mockClear()
  })

  it("returns 403 without admin session", async () => {
    const res = await DELETE(makeDeleteReq(), makeContext("evt-42"))
    expect(res.status).toBe(403)
  })

  it("returns 204 on successful delete", async () => {
    const session = createSession()
    const res = await DELETE(makeDeleteReq(session.token), makeContext("evt-42"))
    expect(res.status).toBe(204)
    expect(deleteEventMock).toHaveBeenCalledWith("evt-42")
  })

  it("returns 404 when event not found", async () => {
    const session = createSession()
    const res = await DELETE(makeDeleteReq(session.token), makeContext("nonexistent"))
    expect(res.status).toBe(404)
  })
})
