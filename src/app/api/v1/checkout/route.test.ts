import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"

// ── Mock dependencies ───────────────────────────────

const mockFindEventWithPricing = vi.fn()
const mockCreateOrderForEvent = vi.fn()
const mockCreateCheckoutSession = vi.fn()
const mockRateLimit = vi.fn()
const mockVerifyCsrf = vi.fn()

vi.mock("@/adapters/db/event-repository", () => ({
  findEventWithPricing: (...args: unknown[]) => mockFindEventWithPricing(...args),
}))

vi.mock("@/domain/orders/create-order", () => ({
  createOrderForEvent: (...args: unknown[]) => mockCreateOrderForEvent(...args),
  InsufficientCapacityError: class extends Error {
    constructor(msg: string) { super(msg); this.name = "InsufficientCapacityError" }
  },
  EventNotFoundError: class extends Error {
    constructor(msg: string) { super(msg); this.name = "EventNotFoundError" }
  },
}))

vi.mock("@/adapters/payments/stripe/checkout", () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
  StripeNotConfiguredError: class extends Error {
    constructor() { super("Stripe not configured"); this.name = "StripeNotConfiguredError" }
  },
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock("@/lib/security/verifyCsrf", () => ({
  verifyCsrf: (...args: unknown[]) => mockVerifyCsrf(...args),
}))

vi.mock("@/lib/ip", () => ({
  _getClientIp: () => "127.0.0.1",
}))

// ── Fixtures ────────────────────────────────────────

const activeEvent = {
  id: "chambao",
  title: "Chambao Live",
  priceCents: 3500,
  capacity: 5000,
  ticketsSold: 100,
  active: true,
}

const createdOrder = {
  id: "order-uuid-1",
  stripeSessionId: null,
  eventId: "chambao",
  customerEmail: "fan@example.com",
  amountCents: 3500,
  currency: "EUR",
  status: "pending",
  quantity: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ── Helpers ─────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/v1/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ── Tests ───────────────────────────────────────────

describe("POST /api/v1/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://test-festival.com"
    mockRateLimit.mockResolvedValue(true)
    mockVerifyCsrf.mockReturnValue(true)
    mockFindEventWithPricing.mockResolvedValue(activeEvent)
    mockCreateOrderForEvent.mockResolvedValue(createdOrder)
    mockCreateCheckoutSession.mockResolvedValue("https://checkout.stripe.com/test")
  })

  it("returns checkout URL on valid request", async () => {
    const res = await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.url).toBe("https://checkout.stripe.com/test")
  })

  it("returns 400 when eventId is missing", async () => {
    const res = await POST(makeRequest({ email: "fan@example.com" }))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe("Validation failed")
    expect(json.details).toBeDefined()
  })

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ eventId: "chambao" }))
    expect(res.status).toBe(400)
  })

  it("returns 404 when event does not exist", async () => {
    mockFindEventWithPricing.mockResolvedValue(null)

    const res = await POST(makeRequest({ eventId: "nonexistent", email: "fan@example.com" }))
    expect(res.status).toBe(404)
  })

  it("returns 404 when event is inactive", async () => {
    mockFindEventWithPricing.mockResolvedValue({ ...activeEvent, active: false })

    const res = await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when event has no price", async () => {
    mockFindEventWithPricing.mockResolvedValue({ ...activeEvent, priceCents: null })

    const res = await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("price")
  })

  it("passes quantity and locale through to checkout", async () => {
    await POST(makeRequest({ eventId: "chambao", email: "fan@example.com", quantity: 3, locale: "en" }))

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 3,
        locale: "en",
      }),
    )
  })

  // ── Rate Limiting ──────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    mockRateLimit.mockResolvedValue(false)

    const res = await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(res.status).toBe(429)

    const json = await res.json()
    expect(json.error).toContain("Too many requests")
  })

  it("does not process checkout when rate limited", async () => {
    mockRateLimit.mockResolvedValue(false)

    await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(mockFindEventWithPricing).not.toHaveBeenCalled()
    expect(mockCreateOrderForEvent).not.toHaveBeenCalled()
  })

  // ── CSRF Validation ────────────────────────────────

  it("returns 403 when CSRF token is invalid", async () => {
    mockVerifyCsrf.mockReturnValue(false)

    const res = await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.error).toContain("CSRF")
  })

  it("does not process checkout when CSRF fails", async () => {
    mockVerifyCsrf.mockReturnValue(false)

    await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(mockFindEventWithPricing).not.toHaveBeenCalled()
    expect(mockCreateOrderForEvent).not.toHaveBeenCalled()
  })

  it("rate limit is checked before CSRF", async () => {
    mockRateLimit.mockResolvedValue(false)
    mockVerifyCsrf.mockReturnValue(false)

    const res = await POST(makeRequest({ eventId: "chambao", email: "fan@example.com" }))
    expect(res.status).toBe(429)
    expect(mockVerifyCsrf).not.toHaveBeenCalled()
  })
})
