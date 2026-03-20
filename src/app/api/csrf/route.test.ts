import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"

describe("GET /api/csrf", () => {
  // NOTE: CSRF_SECRET has a Zod default ("dev-csrf-change-me-in-production"),
  // so it is always available via serverEnv. No need to stubEnv.

  it("returns csrfToken and sets sn_sid cookie when no session exists", async () => {
    const req = new NextRequest("https://example.com/api/csrf", { method: "GET" })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.csrfToken).toBeDefined()
    expect(typeof json.csrfToken).toBe("string")
    expect(json.csrfToken.length).toBeGreaterThan(0)

    const cookie = res.cookies.get("sn_sid")
    expect(cookie).toBeDefined()
  })

  it("reuses existing sn_sid session cookie", async () => {
    const req = new NextRequest("https://example.com/api/csrf", {
      method: "GET",
      headers: { cookie: "sn_sid=existing-session-id" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    // Should NOT set a new cookie since session already exists
    const cookie = res.cookies.get("sn_sid")
    expect(cookie).toBeUndefined()
  })

  it("returns different tokens for different sessions", async () => {
    const req1 = new NextRequest("https://example.com/api/csrf", {
      method: "GET",
      headers: { cookie: "sn_sid=session-aaa" },
    })
    const req2 = new NextRequest("https://example.com/api/csrf", {
      method: "GET",
      headers: { cookie: "sn_sid=session-bbb" },
    })

    const [res1, res2] = await Promise.all([GET(req1), GET(req2)])
    const json1 = await res1.json()
    const json2 = await res2.json()

    expect(json1.csrfToken).not.toBe(json2.csrfToken)
  })
})
