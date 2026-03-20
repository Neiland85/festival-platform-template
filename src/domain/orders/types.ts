/**
 * Order domain types — shared between use cases and repositories.
 */

export interface Order {
  id: string
  stripeSessionId: string | null
  eventId: string
  customerEmail: string
  amountCents: number
  currency: string
  status: OrderStatus
  quantity: number
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus = "pending" | "completed" | "cancelled" | "refunded"

export interface EventWithPricing {
  id: string
  title: string
  priceCents: number | null
  capacity: number | null
  ticketsSold: number
  active: boolean
}

// ── Domain Errors ───────────────────────────────────

export class EventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Event not found or inactive: ${eventId}`)
    this.name = "EventNotFoundError"
  }
}

export class EventNoPriceError extends Error {
  constructor(eventId: string) {
    super(`Event has no price configured: ${eventId}`)
    this.name = "EventNoPriceError"
  }
}

export class InsufficientCapacityError extends Error {
  constructor(eventId: string, available: number, requested: number) {
    super(
      `Insufficient capacity for event ${eventId}: available=${available}, requested=${requested}`,
    )
    this.name = "InsufficientCapacityError"
  }
}

export class OrderNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Order not found: ${identifier}`)
    this.name = "OrderNotFoundError"
  }
}
