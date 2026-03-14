import { describe, it, expect, vi, beforeEach } from "vitest"
import { completeOrder, OrderNotFoundError } from "./complete-order"

// ── Mock DB layer ───────────────────────────────────

const mockFindOrderByStripeSession = vi.fn()
const mockUpdateOrderStatus = vi.fn()
const mockIncrementTicketsSold = vi.fn()

vi.mock("@/adapters/db/order-repository", () => ({
  findOrderByStripeSession: (...args: unknown[]) => mockFindOrderByStripeSession(...args),
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
}))

vi.mock("@/adapters/db/event-repository", () => ({
  incrementTicketsSold: (...args: unknown[]) => mockIncrementTicketsSold(...args),
}))

// ── Fixtures ────────────────────────────────────────

const pendingOrder = {
  id: "order-1",
  stripeSessionId: "cs_test_123",
  eventId: "chambao",
  customerEmail: "fan@example.com",
  amountCents: 3500,
  currency: "EUR",
  status: "pending" as const,
  quantity: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ── Tests ───────────────────────────────────────────

describe("completeOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindOrderByStripeSession.mockResolvedValue(pendingOrder)
    mockUpdateOrderStatus.mockResolvedValue(undefined)
    mockIncrementTicketsSold.mockResolvedValue(undefined)
  })

  it("marks a pending order as completed and increments tickets", async () => {
    await completeOrder("cs_test_123")

    expect(mockFindOrderByStripeSession).toHaveBeenCalledWith("cs_test_123")
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith("order-1", "completed")
    expect(mockIncrementTicketsSold).toHaveBeenCalledWith("chambao", 2)
  })

  it("is idempotent — does nothing if order is already completed", async () => {
    mockFindOrderByStripeSession.mockResolvedValue({
      ...pendingOrder,
      status: "completed",
    })

    await completeOrder("cs_test_123")

    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
    expect(mockIncrementTicketsSold).not.toHaveBeenCalled()
  })

  it("throws OrderNotFoundError when session ID is unknown", async () => {
    mockFindOrderByStripeSession.mockResolvedValue(null)

    await expect(completeOrder("cs_unknown")).rejects.toThrow(OrderNotFoundError)
  })
})
