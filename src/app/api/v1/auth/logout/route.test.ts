import { describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"
import { createSession, validateSession, _clearAllSessions } from "@/lib/auth/sessionStore"

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  const cookieStr = token ? `admin_session=${token}` : ""
  if (cookieStr) headers["cookie"] = cookieStr

  return new NextRequest("https://example.com/api/v1/auth/logout", {
    method: "POST",
    headers,
  })
}

describe("POST /api/v1/auth/logout", () => {
  beforeEach(() => {
    _clearAllSessions()
  })

  it("returns 200 on logout with valid session", async () => {
    const session = createSession()
    expect(validateSession(session.token)).toBe(true)

    const res = await POST(makeRequest(session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("invalidates session token after logout", async () => {
    const session = createSession()
    await POST(makeRequest(session.token))

    expect(validateSession(session.token)).toBe(false)
  })

  it("clears admin_session cookie with maxAge=0", async () => {
    const session = createSession()
    const res = await POST(makeRequest(session.token))

    const cookie = res.cookies.get("admin_session")
    expect(cookie).toBeDefined()
    expect(cookie!.value).toBe("")
  })

  it("handles logout without a session token gracefully", async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
