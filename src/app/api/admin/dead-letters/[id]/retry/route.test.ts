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
const mockRetryDeadLetter = vi.fn()

vi.mock("@/lib/webhooks/dead-letter-queue", () => ({
  getDeadLetter: (...args: unknown[]) => mockGetDeadLetter(...args),
  retryDeadLetter: (...args: unknown[]) => mockRetryDeadLetter(...args),
}))

// ── Mock logger ─────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  log: vi.fn(),
}))

// ── Helpers ─────────────────────────────────────────
const ENTRY_ID = "dlq-retry-001"

function makeReq(token?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest(`https://example.com/api/admin/dead-letters/${ENTRY_ID}/retry`, {
    method: "POST",
    headers,
  })
}

function makeParams(id = ENTRY_ID) {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/admin/dead-letters/[id]/retry", () => {
  beforeEach(() => {
    _clearAllSessions()
    mockVerifyCsrf.mockReset()
    mockGetDeadLetter.mockReset()
    mockRetryDeadLetter.mockReset()
    // Default: getDeadLetter returns a plausible entry for log metadata
    mockGetDeadLetter.mockResolvedValue({
      id: ENTRY_ID,
      eventId: "evt_test_123",
      eventType: "checkout.session.completed",
      provider: "stripe",
    })
  })

  // ── CSRF ────────────────────────────────────────
  it("returns 403 when CSRF token is missing or invalid", async () => {
    mockVerifyCsrf.mockReturnValue(false)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("Invalid CSRF token")
  })

  // ── Auth ────────────────────────────────────────
  it("returns 403 without admin session", async () => {
    mockVerifyCsrf.mockReturnValue(true)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("unauthorized")
  })

  // ── Success ─────────────────────────────────────
  it("retries entry and returns ok", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockRetryDeadLetter.mockResolvedValueOnce({ ok: true })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.id).toBe(ENTRY_ID)
    expect(mockRetryDeadLetter).toHaveBeenCalledWith(ENTRY_ID)
  })

  // ── Domain error codes ──────────────────────────
  it("returns 404 when entry not found", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockRetryDeadLetter.mockResolvedValueOnce({
      ok: false,
      reason: "Dead letter entry not found",
      code: "not_found",
    })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json.code).toBe("not_found")
  })

  it("returns 409 when already resolved", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockRetryDeadLetter.mockResolvedValueOnce({
      ok: false,
      reason: "Entry is already resolved",
      code: "already_resolved",
    })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(409)

    const json = await res.json()
    expect(json.code).toBe("already_resolved")
  })

  it("returns 429 when max attempts reached", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockRetryDeadLetter.mockResolvedValueOnce({
      ok: false,
      reason: "Max retry attempts reached (5/5)",
      code: "max_attempts",
    })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(429)

    const json = await res.json()
    expect(json.code).toBe("max_attempts")
  })

  it("returns 422 when event type is not retryable", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockRetryDeadLetter.mockResolvedValueOnce({
      ok: false,
      reason: 'Event type "invoice.paid" is not safe to retry.',
      code: "not_retryable",
    })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(422)

    const json = await res.json()
    expect(json.code).toBe("not_retryable")
  })

  it("returns 500 on domain error", async () => {
    mockVerifyCsrf.mockReturnValue(true)
    const session = await createSessionAsync()
    mockRetryDeadLetter.mockResolvedValueOnce({
      ok: false,
      reason: "Order not found: ord-123",
      code: "domain_error",
    })

    const res = await POST(makeReq(session.token), makeParams())
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.code).toBe("domain_error")
  })

  // ── Enforcement order ───────────────────────────
  it("checks CSRF before auth — domain layer never touched", async () => {
    mockVerifyCsrf.mockReturnValue(false)

    await POST(makeReq(), makeParams())
    expect(mockRetryDeadLetter).not.toHaveBeenCalled()
  })
})
