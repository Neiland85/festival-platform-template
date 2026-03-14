import { describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { createSession, _clearAllSessions } from "@/lib/auth/sessionStore"
import { audit } from "@/lib/observability/auditLog"

function makeReq(query = "", token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest(`https://example.com/api/admin/audit-log${query}`, {
    method: "GET",
    headers,
  })
}

describe("GET /api/admin/audit-log", () => {
  beforeEach(() => {
    _clearAllSessions()
  })

  it("returns 403 without admin session", async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it("returns audit entries with valid session", async () => {
    const session = createSession()

    // Generate a few audit entries
    audit({ action: "admin.login", ip: "1.2.3.4", actor: "admin" })
    audit({ action: "event.create", ip: "1.2.3.4", resource: "evt-1" })

    const res = await GET(makeReq("", session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.entries).toBeDefined()
    expect(Array.isArray(json.entries)).toBe(true)
    expect(json.total).toBeGreaterThanOrEqual(2)
    expect(json.stats).toBeDefined()
    expect(json.stats.actionCounts).toBeDefined()
  })

  it("filters by action parameter", async () => {
    const session = createSession()

    audit({ action: "admin.login", ip: "1.2.3.4" })
    audit({ action: "event.create", ip: "1.2.3.4" })

    const res = await GET(makeReq("?action=admin.login", session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    for (const entry of json.entries) {
      expect(entry.action).toBe("admin.login")
    }
  })

  it("returns 400 for invalid action filter", async () => {
    const session = createSession()
    const res = await GET(makeReq("?action=invalid.action", session.token))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe("invalid_action")
    expect(json.validActions).toBeDefined()
  })

  it("respects limit parameter", async () => {
    const session = createSession()
    const res = await GET(makeReq("?limit=2", session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.entries.length).toBeLessThanOrEqual(2)
  })

  it("sets Cache-Control: no-store", async () => {
    const session = createSession()
    const res = await GET(makeReq("", session.token))
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })
})
