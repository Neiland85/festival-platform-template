import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, POST } from "./route"
import { createSession, _clearAllSessions } from "@/lib/auth/sessionStore"
import type { Event } from "@/domain/events/types"

// ── Mock DB layer ───────────────────────────────────

const mockEvents: Event[] = [
  {
    id: "evt-1",
    title: "Flamenco Night",
    description: "Live flamenco show",
    highlight: "Best show in town",
    ticketUrl: "https://tickets.example.com/1",
    active: true,
    createdAt: new Date("2026-01-01"),
  },
]

vi.mock("@/adapters/db/event-repository", () => ({
  findAllEvents: vi.fn(async () => mockEvents),
  saveEvent: vi.fn(async () => {}),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

// ── Helpers ─────────────────────────────────────────

function makeGetRequest(): NextRequest {
  return new NextRequest("https://example.com/api/v1/events", { method: "GET" })
}

function makePostRequest(body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest("https://example.com/api/v1/events", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

const validEvent = {
  title: "Jazz Festival",
  description: "Annual jazz music event in Nerja",
  highlight: "Top international artists",
  ticketUrl: "https://tickets.example.com/jazz",
}

// ── Tests ───────────────────────────────────────────

describe("GET /api/v1/events", () => {
  it("returns list of events with data wrapper", async () => {
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].title).toBe("Flamenco Night")
  })

  it("sets Cache-Control: no-store", async () => {
    const res = await GET(makeGetRequest())
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })
})

describe("POST /api/v1/events", () => {
  beforeEach(() => {
    _clearAllSessions()
  })

  it("returns 403 without admin session", async () => {
    const res = await POST(makePostRequest(validEvent))
    expect(res.status).toBe(403)
  })

  it("returns 201 with valid payload and admin session", async () => {
    const session = createSession()
    const res = await POST(makePostRequest(validEvent, session.token))
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.data.title).toBe("Jazz Festival")
    expect(json.data.id).toBeDefined()
    expect(json.data.active).toBe(true)
  })

  it("returns 400 on invalid payload (missing title)", async () => {
    const session = createSession()
    const res = await POST(
      makePostRequest({ description: "No title", highlight: "H", ticketUrl: "https://x.com" }, session.token)
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 on invalid ticketUrl format", async () => {
    const session = createSession()
    const res = await POST(
      makePostRequest({ ...validEvent, ticketUrl: "not-a-url" }, session.token)
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when title exceeds max length", async () => {
    const session = createSession()
    const res = await POST(
      makePostRequest({ ...validEvent, title: "x".repeat(201) }, session.token)
    )
    expect(res.status).toBe(400)
  })
})
