import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { createSessionAsync, _clearAllSessions } from "@/lib/auth/sessionStore"

// ── Mock DB layer ───────────────────────────────────
const mockQueryAuditEvents = vi.fn()

vi.mock("@/adapters/db/audit-repository", () => ({
  queryAuditEvents: (...args: unknown[]) => mockQueryAuditEvents(...args),
}))

// ── Helpers ─────────────────────────────────────────
function makeReq(query = "", token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest(`https://example.com/api/admin/audit-log${query}`, {
    method: "GET",
    headers,
  })
}

const FAKE_ENTRIES = [
  { id: "1", action: "admin.login", actor: "admin", ip: "hash1", resource: "-", details: "{}", requestId: "aud-1", createdAt: new Date() },
  { id: "2", action: "event.create", actor: "admin", ip: "hash1", resource: "evt-1", details: "{}", requestId: "aud-2", createdAt: new Date() },
]

describe("GET /api/admin/audit-log", () => {
  beforeEach(() => {
    _clearAllSessions()
    mockQueryAuditEvents.mockReset()
  })

  it("returns 403 without admin session", async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it("returns audit entries with valid session", async () => {
    const session = await createSessionAsync()
    mockQueryAuditEvents.mockResolvedValueOnce(FAKE_ENTRIES)

    const res = await GET(makeReq("", session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.entries).toBeDefined()
    expect(Array.isArray(json.entries)).toBe(true)
    expect(json.total).toBe(2)
  })

  it("passes action filter to query", async () => {
    const session = await createSessionAsync()
    mockQueryAuditEvents.mockResolvedValueOnce([FAKE_ENTRIES[0]])

    const res = await GET(makeReq("?action=admin.login", session.token))
    expect(res.status).toBe(200)

    expect(mockQueryAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.login" }),
    )
  })

  it("passes limit parameter to query", async () => {
    const session = await createSessionAsync()
    mockQueryAuditEvents.mockResolvedValueOnce([])

    await GET(makeReq("?limit=2", session.token))

    expect(mockQueryAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 2 }),
    )
  })

  it("caps limit at 1000", async () => {
    const session = await createSessionAsync()
    mockQueryAuditEvents.mockResolvedValueOnce([])

    await GET(makeReq("?limit=9999", session.token))

    expect(mockQueryAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1000 }),
    )
  })

  it("sets Cache-Control: no-store", async () => {
    const session = await createSessionAsync()
    mockQueryAuditEvents.mockResolvedValueOnce([])

    const res = await GET(makeReq("", session.token))
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })
})
