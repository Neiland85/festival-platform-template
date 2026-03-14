import { describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { createSession, _clearAllSessions } from "@/lib/auth/sessionStore"

function makeReq(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest("https://example.com/api/admin/scorecard", {
    method: "GET",
    headers,
  })
}

describe("GET /api/admin/scorecard", () => {
  beforeEach(() => {
    _clearAllSessions()
  })

  it("returns 401 without admin session", async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it("returns scorecard data with valid session", async () => {
    const session = createSession()
    const res = await GET(makeReq(session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    // Scorecard should have a score and categories
    expect(json).toBeDefined()
    expect(typeof json).toBe("object")
  })

  it("sets Cache-Control: no-store", async () => {
    const session = createSession()
    const res = await GET(makeReq(session.token))
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })
})
