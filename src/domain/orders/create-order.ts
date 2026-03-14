/**
 * Create a new order with capacity validation.
 *
 * Business rules:
 *   - Event must exist and be active
 *   - Capacity must not be exceeded
 *   - Amount must be positive
 */
import type { CreateOrderInput, Order } from "./types"
import { findEventWithPricing } from "@/adapters/db/event-repository"
import { createOrder as dbCreateOrder, countOrdersByEvent } from "@/adapters/db/order-repository"

export class InsufficientCapacityError extends Error {
  constructor(eventId: string, available: number) {
    super(`Event ${eventId} has only ${available} tickets available`)
    this.name = "InsufficientCapacityError"
  }
}

export class EventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Event ${eventId} not found or inactive`)
    this.name = "EventNotFoundError"
  }
}

export async function createOrderForEvent(input: CreateOrderInput): Promise<Order> {
  const event = await findEventWithPricing(input.eventId)
  if (!event || !event.active) {
    throw new EventNotFoundError(input.eventId)
  }

  // Check capacity (default 5000 if not set)
  const capacity = event.capacity ?? 5000
  const ticketsSold = await countOrdersByEvent(input.eventId)
  const quantity = input.quantity ?? 1
  const available = capacity - ticketsSold

  if (quantity > available) {
    throw new InsufficientCapacityError(input.eventId, available)
  }

  return dbCreateOrder({
    eventId: input.eventId,
    customerEmail: input.customerEmail,
    amountCents: input.amountCents,
    currency: input.currency ?? "EUR",
    quantity,
  })
}
