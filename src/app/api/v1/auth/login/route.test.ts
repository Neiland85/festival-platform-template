import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"
import { _clearAllSessions } from "@/lib/auth/sessionStore"
import { _resetLoginAttempts } from "@/lib/auth/loginRateLimit"

const CORRECT_PASSWORD = "test-admin-password-123"

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeRawRequest(rawBody: string): NextRequest {
  return new NextRequest("https://example.com/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  })
}

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_PASSWORD", CORRECT_PASSWORD)
    _clearAllSessions()
    _resetLoginAttempts()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ── Happy path ────────────────────────────────────

  it("returns 200 + session cookie on correct password", async () => {
    const res = await POST(makeRequest({ password: CORRECT_PASSWORD }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)

    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toContain("admin_session=")
  })

  // ── Validation ────────────────────────────────────

  it("returns 400 on invalid JSON body", async () => {
    const res = await POST(makeRawRequest("{not-json"))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid json")
  })

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid credentials format")
  })

  it("returns 400 when password is not a string", async () => {
    const res = await POST(makeRequest({ password: 12345 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid credentials format")
  })

  it("returns 400 when password is empty string", async () => {
    const res = await POST(makeRequest({ password: "" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid credentials format")
  })

  it("returns 400 when password exceeds 256 chars", async () => {
    const res = await POST(makeRequest({ password: "a".repeat(257) }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("invalid credentials format")
  })

  // ── Wrong password ────────────────────────────────

  it("returns 401 on wrong password", async () => {
    const res = await POST(makeRequest({ password: "wrong-password" }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("unauthorized")
  })

  // ── Rate limiting ─────────────────────────────────

  it("returns 429 after 5 failed attempts", async () => {
    const makeRlReq = (body: unknown) =>
      new NextRequest("https://example.com/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.99.99.99",
        },
        body: JSON.stringify(body),
      })

    for (let i = 0; i < 5; i++) {
      await POST(makeRlReq({ password: "wrong" }))
    }

    const res = await POST(makeRlReq({ password: "wrong" }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toContain("too many attempts")
  })

  // ── Cookie properties ─────────────────────────────

  it("sets cookie with httpOnly and lax sameSite", async () => {
    const res = await POST(makeRequest({ password: CORRECT_PASSWORD }))
    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toBeDefined()
    expect(setCookie).toContain("admin_session=")
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie!.toLowerCase()).toContain("samesite=lax")
  })
})
