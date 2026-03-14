import { describe, it, expect, vi, beforeEach } from "vitest"
import { verifyAndHandleWebhook, WebhookVerificationError } from "./webhooks"

// ── Mock Stripe client ──────────────────────────────

const mockConstructEvent = vi.fn()

vi.mock("./client", () => ({
  isStripeConfigured: true,
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}))

// ── Mock domain logic ───────────────────────────────

const mockCompleteOrder = vi.fn()
const mockUpdateOrderStatus = vi.fn()

vi.mock("@/domain/orders/complete-order", () => ({
  completeOrder: (...args: unknown[]) => mockCompleteOrder(...args),
}))

vi.mock("@/adapters/db/order-repository", () => ({
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
}))

// ── Tests ───────────────────────────────────────────

describe("verifyAndHandleWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test_secret"
  })

  it("completes order on checkout.session.completed event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", metadata: { orderId: "order-1" } } },
    })
    mockCompleteOrder.mockResolvedValue(undefined)

    const result = await verifyAndHandleWebhook("body", "sig_test")

    expect(result).toEqual({ received: true, type: "checkout.session.completed" })
    expect(mockCompleteOrder).toHaveBeenCalledWith("cs_test_123")
  })

  it("cancels order on checkout.session.expired event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.expired",
      data: { object: { id: "cs_expired", metadata: { orderId: "order-2" } } },
    })
    mockUpdateOrderStatus.mockResolvedValue(undefined)

    const result = await verifyAndHandleWebhook("body", "sig_test")

    expect(result).toEqual({ received: true, type: "checkout.session.expired" })
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith("order-2", "cancelled")
  })

  it("handles unknown event types gracefully", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: {} },
    })

    const result = await verifyAndHandleWebhook("body", "sig_test")

    expect(result).toEqual({ received: true, type: "payment_intent.succeeded" })
    expect(mockCompleteOrder).not.toHaveBeenCalled()
  })

  it("throws WebhookVerificationError when signature is invalid", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    await expect(
      verifyAndHandleWebhook("body", "bad_sig"),
    ).rejects.toThrow(WebhookVerificationError)
  })

  it("throws when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env["STRIPE_WEBHOOK_SECRET"]

    await expect(
      verifyAndHandleWebhook("body", "sig_test"),
    ).rejects.toThrow(WebhookVerificationError)
  })
})
