import { describe, it, expect, vi, beforeEach } from "vitest"
import { createOrderForEvent, InsufficientCapacityError, EventNotFoundError } from "./create-order"

// ── Mock DB layer ───────────────────────────────────

const mockFindEventWithPricing = vi.fn()
const mockCountOrdersByEvent = vi.fn()
const mockDbCreateOrder = vi.fn()

vi.mock("@/adapters/db/event-repository", () => ({
  findEventWithPricing: (...args: unknown[]) => mockFindEventWithPricing(...args),
}))

vi.mock("@/adapters/db/order-repository", () => ({
  createOrder: (...args: unknown[]) => mockDbCreateOrder(...args),
  countOrdersByEvent: (...args: unknown[]) => mockCountOrdersByEvent(...args),
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
  status: "pending" as const,
  quantity: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ── Tests ───────────────────────────────────────────

describe("createOrderForEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindEventWithPricing.mockResolvedValue(activeEvent)
    mockCountOrdersByEvent.mockResolvedValue(100)
    mockDbCreateOrder.mockResolvedValue(createdOrder)
  })

  it("creates an order for an active event with capacity", async () => {
    const order = await createOrderForEvent({
      eventId: "chambao",
      customerEmail: "fan@example.com",
      amountCents: 3500,
    })

    expect(order).toEqual(createdOrder)
    expect(mockDbCreateOrder).toHaveBeenCalledWith({
      eventId: "chambao",
      customerEmail: "fan@example.com",
      amountCents: 3500,
      currency: "EUR",
      quantity: 1,
    })
  })

  it("passes custom currency and quantity to DB", async () => {
    await createOrderForEvent({
      eventId: "chambao",
      customerEmail: "fan@example.com",
      amountCents: 7000,
      currency: "USD",
      quantity: 2,
    })

    expect(mockDbCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD", quantity: 2 }),
    )
  })

  it("throws EventNotFoundError when event does not exist", async () => {
    mockFindEventWithPricing.mockResolvedValue(null)

    await expect(
      createOrderForEvent({
        eventId: "nonexistent",
        customerEmail: "fan@example.com",
        amountCents: 3500,
      }),
    ).rejects.toThrow(EventNotFoundError)
  })

  it("throws EventNotFoundError when event is inactive", async () => {
    mockFindEventWithPricing.mockResolvedValue({ ...activeEvent, active: false })

    await expect(
      createOrderForEvent({
        eventId: "chambao",
        customerEmail: "fan@example.com",
        amountCents: 3500,
      }),
    ).rejects.toThrow(EventNotFoundError)
  })

  it("throws InsufficientCapacityError when sold out", async () => {
    mockCountOrdersByEvent.mockResolvedValue(5000) // at capacity

    await expect(
      createOrderForEvent({
        eventId: "chambao",
        customerEmail: "fan@example.com",
        amountCents: 3500,
      }),
    ).rejects.toThrow(InsufficientCapacityError)
  })

  it("throws InsufficientCapacityError when requesting more than available", async () => {
    mockCountOrdersByEvent.mockResolvedValue(4999) // 1 ticket left

    await expect(
      createOrderForEvent({
        eventId: "chambao",
        customerEmail: "fan@example.com",
        amountCents: 7000,
        quantity: 2, // wants 2, only 1 available
      }),
    ).rejects.toThrow(InsufficientCapacityError)
  })

  it("uses default capacity of 5000 when event has null capacity", async () => {
    mockFindEventWithPricing.mockResolvedValue({ ...activeEvent, capacity: null })
    mockCountOrdersByEvent.mockResolvedValue(4999)

    // Should succeed with 1 ticket left (5000 - 4999 = 1)
    const order = await createOrderForEvent({
      eventId: "chambao",
      customerEmail: "fan@example.com",
      amountCents: 3500,
    })
    expect(order).toEqual(createdOrder)
  })
})
