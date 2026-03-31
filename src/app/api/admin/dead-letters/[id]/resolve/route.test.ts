import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"
import { createSessionAsync, _clearAllSessions } from "@/lib/auth/sessionStore"

// ── Mock CSRF ───────────────────────────────────────
const mockVerifyCsrf = vi.fn()

vi.mock("@/lib/security/verifyCsrf", () => ({
  verifyCsrf: (...args: unknown[]) => mockVerifyCsrf(...args),
}))

// ── Mock DLQ domain layer ──────────────────────────
const mockGetDeadLetter = vi.fn()
const mockResolveDeadLetter = vi.fn()

vi.mock("@/lib/webhooks/dead-letter-queue", () => ({
  getDeadLetter: (...args: unknown[]) => mockGetDeadLetter(...args),
  resolveDeadLetter: (...args: unknown[]) => mockResolveDeadLetter(...args),
}))

// ── Mock logger ─────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  log: vi.fn(),
}))

// ── Helpers ─────────────────────────────────────────
const ENTRY_ID = "dlq-resolve-001"

function makeReq(token?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest(`https://example.com/api/admin/dead-letters/${ENTRY_ID}/resolve`, {
    method: "POST",
    headers,
  })
}

function makeParams(id = ENTRY_ID) {
  return { params: Promise.resolve({ id }) }
}

function unresolvedEntry(id = ENTRY_ID) {
  return {
    id,
    provider: "stripe",
    eventType: "checkout.session.completed",
    eventId: "evt_123",
    payload: "{}",
    error: "timeout",
    attempts: 1,
    resolvedAt: null,
    createdAt: new Date(),
  }
}

describe("POST /api/admin/dead-letters/[id]/resolve", () => {
  beforeEach(() => {
    _clearAllSessions()
    mockVerifyCsrf.mockReset()
    mockGetDeadLetter.mockReset()
    mockResolveDeadLetter.mockReset()
  })

  // ── CSRF ────────────────────────────────────────
  it("returns 403 when CSRF token is missing or invalid", async () => {
    mockVerifyCsrf.mockReturnValue(false)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.error).toBe("Invalid CSRF token")
  })

  // ── Auth ────────────────────────────────────────
  it("returns 403 without admin session", async () => {
    mockVerifyCsrf.mockReturnValue(true)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.error).toBe("unauthorized")
  })

  // ── Not found ───────────────────────────────────
  it("returns 404 when dead letter does not exist", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockGetDeadLetter.mockResolvedValueOnce(null)

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(404)
  })

  // ── Already resolved ────────────────────────────
  it("returns 409 when entry is already resolved", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockGetDeadLetter.mockResolvedValueOnce({
      ...unresolvedEntry(),
      resolvedAt: new Date(),
    })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(409)

    const json = await res.json()
    expect(json.error).toBe("Already resolved")
  })

  // ── Success ─────────────────────────────────────
  it("resolves entry and returns ok", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockGetDeadLetter.mockResolvedValueOnce(unresolvedEntry())
    mockResolveDeadLetter.mockResolvedValueOnce(undefined)

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.id).toBe(ENTRY_ID)
    expect(mockResolveDeadLetter).toHaveBeenCalledWith(ENTRY_ID)
  })

  // ── Enforcement order ───────────────────────────
  it("checks CSRF before auth (no session needed to get CSRF 403)", async () => {
    mockVerifyCsrf.mockReturnValue(false)

    // No session cookie provided at all
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("Invalid CSRF token")

    // Domain layer should never have been touched
    expect(mockGetDeadLetter).not.toHaveBeenCalled()
    expect(mockResolveDeadLetter).not.toHaveBeenCalled()
  })
})
