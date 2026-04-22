import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { createSessionAsync, _clearAllSessions } from "@/lib/auth/sessionStore"

// ── Mock DLQ domain layer ──────────────────────────
const mockListDeadLetters = vi.fn()

vi.mock("@/lib/webhooks/dead-letter-queue", () => ({
  listDeadLetters: (...args: unknown[]) => mockListDeadLetters(...args),
}))

// ── Helpers ─────────────────────────────────────────
function makeReq(query = "", token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest(`https://example.com/api/admin/dead-letters${query}`, {
    method: "GET",
    headers,
  })
}

describe("GET /api/admin/dead-letters", () => {
  beforeEach(() => {
    _clearAllSessions()
    mockListDeadLetters.mockReset()
  })

  it("returns 403 without admin session", async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it("returns entries with valid session", async () => {
    const session = await createSessionAsync()
    const fakeEntries = [
      { id: "dlq-1", eventType: "checkout.session.completed", error: "timeout", attempts: 1, createdAt: new Date().toISOString() },
    ]
    mockListDeadLetters.mockResolvedValueOnce(fakeEntries)

    const res = await GET(makeReq("", session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.entries).toHaveLength(1)
    expect(json.entries[0].id).toBe("dlq-1")
    expect(json.entries[0].eventType).toBe("checkout.session.completed")
    // v2: enriched with decision engine data
    expect(json.entries[0].status).toBeDefined()
    expect(json.entries[0].decision).toBeDefined()
    expect(json.entries[0].decision.severity).toBeDefined()
    expect(mockListDeadLetters).toHaveBeenCalledWith(50) // default limit
  })

  it("respects limit parameter", async () => {
    const session = await createSessionAsync()
    mockListDeadLetters.mockResolvedValueOnce([])

    const res = await GET(makeReq("?limit=10", session.token))
    expect(res.status).toBe(200)
    expect(mockListDeadLetters).toHaveBeenCalledWith(10)
  })

  it("caps limit at 200", async () => {
    const session = await createSessionAsync()
    mockListDeadLetters.mockResolvedValueOnce([])

    await GET(makeReq("?limit=999", session.token))
    expect(mockListDeadLetters).toHaveBeenCalledWith(200)
  })

  it("sets Cache-Control: no-store", async () => {
    const session = await createSessionAsync()
    mockListDeadLetters.mockResolvedValueOnce([])

    const res = await GET(makeReq("", session.token))
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })
})
