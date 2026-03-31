import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { createSessionAsync, _clearAllSessions } from "@/lib/auth/sessionStore"

// ── Mock DLQ domain layer ──────────────────────────
const mockGetDeadLettersByEventId = vi.fn()

vi.mock("@/lib/webhooks/dead-letter-queue", () => ({
  getDeadLettersByEventId: (...args: unknown[]) => mockGetDeadLettersByEventId(...args),
}))

// ── Helpers ─────────────────────────────────────────
const CORRELATION_ID = "evt_test_123"

function makeReq(correlationId = CORRELATION_ID, token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers["cookie"] = `admin_session=${token}`

  return new NextRequest(
    `https://example.com/api/admin/dead-letters/timeline/${correlationId}`,
    { method: "GET", headers },
  )
}

function dlqEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "dlq-001",
    provider: "stripe",
    eventType: "checkout.session.completed",
    eventId: CORRELATION_ID,
    payload: "{}",
    error: "completeOrder failed: connection refused",
    attempts: 1,
    resolvedAt: null,
    createdAt: new Date("2026-03-29T10:00:00Z"),
    ...overrides,
  }
}

describe("GET /api/admin/dead-letters/timeline/[correlationId]", () => {
  beforeEach(() => {
    _clearAllSessions()
    mockGetDeadLettersByEventId.mockReset()
  })

  // ── Auth ────────────────────────────────────────
  it("returns 403 without admin session", async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  // ── Empty ───────────────────────────────────────
  it("returns empty timeline when no entries found", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.correlationId).toBe(CORRELATION_ID)
    expect(json.timeline).toEqual([])
    expect(json.message).toBeDefined()
  })

  // ── Basic timeline: unresolved entry ────────────
  it("reconstructs timeline for unresolved entry", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([dlqEntry()])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.correlationId).toBe(CORRELATION_ID)
    expect(json.eventType).toBe("checkout.session.completed")
    expect(json.totalEntries).toBe(1)

    const types = json.timeline.map((e: { type: string }) => e.type)
    expect(types).toContain("webhook.received")
    expect(types).toContain("handler.failed")
    expect(types).toContain("dlq.persisted")
  })

  // ── Manual resolve ──────────────────────────────
  it("shows manual.resolved when attempts = 1 and resolvedAt set", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({ resolvedAt: new Date("2026-03-29T10:30:00Z"), attempts: 1 }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const types = json.timeline.map((e: { type: string }) => e.type)
    expect(types).toContain("manual.resolved")
    expect(types).not.toContain("retry.succeeded")
  })

  // ── Retry success (auto-retry eligible error) ───
  it("shows auto_retry.succeeded when transient error retried and resolved", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({
        attempts: 3,
        resolvedAt: new Date("2026-03-29T11:00:00Z"),
      }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const types = json.timeline.map((e: { type: string }) => e.type)
    expect(types).toContain("auto_retry.succeeded")
    expect(types).not.toContain("manual.resolved")
  })

  // ── Retry success (manual — non-transient error) ─
  it("shows retry.succeeded for non-transient error retried and resolved", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({
        error: "Order not found: ord-123",
        attempts: 2,
        resolvedAt: new Date("2026-03-29T11:00:00Z"),
      }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const types = json.timeline.map((e: { type: string }) => e.type)
    expect(types).toContain("retry.succeeded")
  })

  // ── Retry failures (unresolved, auto-retry eligible) ─
  it("shows auto_retry.exhausted when transient error exhausted auto-retries", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({ attempts: 4, resolvedAt: null }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const types = json.timeline.map((e: { type: string }) => e.type)
    expect(types).toContain("auto_retry.exhausted")

    const exhausted = json.timeline.find((e: { type: string }) => e.type === "auto_retry.exhausted")
    expect(exhausted.meta.autoRetries).toBe(2) // MAX_AUTO_RETRIES
  })

  // ── Auto-retry pending ──────────────────────────
  it("shows auto_retry.pending for new transient failure", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({ attempts: 1, resolvedAt: null }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const types = json.timeline.map((e: { type: string }) => e.type)
    expect(types).toContain("auto_retry.pending")
  })

  // ── Source labeling ─────────────────────────────
  it("labels inferred events correctly", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([dlqEntry()])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const received = json.timeline.find((e: { type: string }) => e.type === "webhook.received")
    expect(received.source).toBe("inferred")

    const persisted = json.timeline.find((e: { type: string }) => e.type === "dlq.persisted")
    expect(persisted.source).toBe("db")
  })

  // ── Multiple entries (re-enqueued) ──────────────
  it("handles multiple DLQ entries for same correlationId", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({ id: "dlq-002", createdAt: new Date("2026-03-29T12:00:00Z"), attempts: 1 }),
      dlqEntry({ id: "dlq-001", createdAt: new Date("2026-03-29T10:00:00Z"), attempts: 2, resolvedAt: new Date("2026-03-29T10:30:00Z") }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    expect(json.totalEntries).toBe(2)

    // Should have timeline events for both entries
    const dlqIds = json.timeline
      .filter((e: { meta?: { dlqId?: string } }) => e.meta?.dlqId)
      .map((e: { meta: { dlqId: string } }) => e.meta.dlqId)
    expect(dlqIds).toContain("dlq-001")
    expect(dlqIds).toContain("dlq-002")
  })

  // ── Chronological order ─────────────────────────
  it("returns events in chronological order", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([
      dlqEntry({ resolvedAt: new Date("2026-03-29T10:30:00Z"), attempts: 1 }),
    ])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    const json = await res.json()

    const timestamps = json.timeline.map((e: { timestamp: string }) => new Date(e.timestamp).getTime())
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
    }
  })

  // ── Cache headers ───────────────────────────────
  it("sets Cache-Control: no-store", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([])

    const res = await GET(makeReq(CORRELATION_ID, session.token))
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })

  // ── Passes correlationId to query ───────────────
  it("queries by the correct correlationId", async () => {
    const session = await createSessionAsync()
    mockGetDeadLettersByEventId.mockResolvedValueOnce([])

    await GET(makeReq("evt_specific_456", session.token))
    expect(mockGetDeadLettersByEventId).toHaveBeenCalledWith("evt_specific_456")
  })
})
