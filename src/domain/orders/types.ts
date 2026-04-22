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

export type OrderStatus =
  | "reserved"   // Capacity deducted, awaiting Stripe payment
  | "completed"  // Payment confirmed via webhook
  | "expired"    // Stripe checkout session expired → capacity released
  | "cancelled"  // Manual cancellation → capacity released
  | "refunded"   // Post-payment refund → capacity released

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

export class CapacitySoldOutError extends Error {
  constructor(eventId: string) {
    super(`Event sold out: ${eventId}`)
    this.name = "CapacitySoldOutError"
  }
}
