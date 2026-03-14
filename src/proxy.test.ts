import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"
import { createSession, _clearAllSessions } from "@/lib/auth/sessionStore"

// Mock signedSession to avoid needing SESSION_SECRET
vi.mock("@/lib/auth/signedSession", () => ({
  verifySignedToken: vi.fn(async () => null),
  looksLikeSignedToken: vi.fn(() => false),
}))

// ── Helpers ─────────────────────────────────────────

function makeReq(
  pathname: string,
  opts: { method?: string; cookie?: string; origin?: string } = {}
): NextRequest {
  const headers: Record<string, string> = {}
  if (opts.cookie) headers["cookie"] = opts.cookie
  if (opts.origin) headers["origin"] = opts.origin

  return new NextRequest(`https://solarisnerja.com${pathname}`, {
    method: opts.method ?? "GET",
    headers,
  })
}

// ── Tests ───────────────────────────────────────────

describe("proxy", () => {
  beforeEach(() => {
    _clearAllSessions()
  })

  // ── Auth: Dashboard ─────────────────────────────

  describe("dashboard auth guard", () => {
    it("redirects to /login when no session cookie", async () => {
      const res = await proxy(makeReq("/dashboard"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects on invalid session token", async () => {
      const res = await proxy(makeReq("/dashboard", { cookie: "admin_session=invalid" }))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("passes through with valid UUID session", async () => {
      const session = createSession()
      const res = await proxy(makeReq("/dashboard", {
        cookie: `admin_session=${session.token}`,
      }))
      // NextResponse.next() returns 200
      expect(res.status).toBe(200)
    })
  })

  // ── Auth: Admin API ─────────────────────────────

  describe("admin API auth guard", () => {
    it("returns 403 when no session", async () => {
      const res = await proxy(makeReq("/api/admin/metrics"))
      expect(res.status).toBe(403)

      const json = await res.json()
      expect(json.error).toBe("unauthorized")
    })

    it("returns 403 on invalid token", async () => {
      const res = await proxy(makeReq("/api/admin/metrics", {
        cookie: "admin_session=not-a-uuid",
      }))
      expect(res.status).toBe(403)
    })

    it("passes through with valid session", async () => {
      const session = createSession()
      const res = await proxy(makeReq("/api/admin/metrics", {
        cookie: `admin_session=${session.token}`,
      }))
      expect(res.status).toBe(200)
    })
  })

  // ── CORS preflight ──────────────────────────────

  describe("CORS preflight", () => {
    it("returns 204 with correct headers for allowed origin", async () => {
      const res = await proxy(makeReq("/api/v1/leads", {
        method: "OPTIONS",
        origin: "https://solarisnerja.com",
      }))
      expect(res.status).toBe(204)
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://solarisnerja.com")
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST")
      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("idempotency-key")
    })

    it("returns 403 for disallowed origin", async () => {
      const res = await proxy(makeReq("/api/v1/leads", {
        method: "OPTIONS",
        origin: "https://evil.com",
      }))
      expect(res.status).toBe(403)
    })

    it("returns 403 when no origin header", async () => {
      const res = await proxy(makeReq("/api/v1/leads", { method: "OPTIONS" }))
      expect(res.status).toBe(403)
    })
  })

  // ── Request ID ──────────────────────────────────

  describe("request ID", () => {
    it("adds x-request-id header to all responses", async () => {
      const res = await proxy(makeReq("/"))
      const requestId = res.headers.get("x-request-id")
      expect(requestId).toBeDefined()
      expect(requestId!.length).toBe(36) // UUID format
    })
  })

  // ── CORS on normal requests ─────────────────────

  describe("CORS on API responses", () => {
    it("sets CORS header for allowed origin on API routes", async () => {
      const res = await proxy(makeReq("/api/v1/leads", {
        origin: "https://www.solarisnerja.com",
      }))
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://www.solarisnerja.com")
    })

    it("does NOT set CORS header for disallowed origin", async () => {
      const res = await proxy(makeReq("/api/v1/leads", {
        origin: "https://evil.com",
      }))
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
    })

    it("does NOT set CORS header on non-API routes", async () => {
      const res = await proxy(makeReq("/eventos", {
        origin: "https://solarisnerja.com",
      }))
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
    })
  })

  // ── Public routes pass through ──────────────────

  describe("public routes", () => {
    it("passes through public pages without auth", async () => {
      const res = await proxy(makeReq("/"))
      expect(res.status).toBe(200)
    })

    it("passes through public API without auth", async () => {
      const res = await proxy(makeReq("/api/v1/leads"))
      expect(res.status).toBe(200)
    })
  })
})
