import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"

describe("GET /api/csrf", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SECRET", "test-csrf-secret-value")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

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

  it("returns 500 when CSRF_SECRET not configured", async () => {
    vi.stubEnv("CSRF_SECRET", "")
    // Need to clear because empty string is falsy
    delete process.env["CSRF_SECRET"]

    const req = new NextRequest("https://example.com/api/csrf", { method: "GET" })
    const res = await GET(req)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toContain("CSRF not configured")
  })
})
