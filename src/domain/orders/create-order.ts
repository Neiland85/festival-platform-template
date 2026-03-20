/**
 * Use case: Create order for event ticket purchase.
 *
 * Validates:
 *   1. Event exists and is active
 *   2. Event has a price configured
 *   3. Sufficient capacity remains
 *
 * Creates a pending order in DB, then returns it for Checkout session creation.
 */

import { findEventWithPricing } from "./event-repository"
import { createOrder } from "./order-repository"
import type { Order } from "./types"
import {
  EventNotFoundError,
  EventNoPriceError,
  InsufficientCapacityError,
} from "./types"

export interface CreateOrderInput {
  eventId: string
  customerEmail: string
  quantity: number
  currency?: string
}

export async function createOrderForEvent(
  input: CreateOrderInput,
): Promise<{ order: Order; eventTitle: string }> {
  const event = await findEventWithPricing(input.eventId)

  if (!event) {
    throw new EventNotFoundError(input.eventId)
  }

  if (event.priceCents == null) {
    throw new EventNoPriceError(input.eventId)
  }

  // Capacity check (if capacity is defined)
  if (event.capacity != null) {
    const available = event.capacity - event.ticketsSold
    if (available < input.quantity) {
      throw new InsufficientCapacityError(
        input.eventId,
        available,
        input.quantity,
      )
    }
  }

  const order = await createOrder({
    eventId: input.eventId,
    customerEmail: input.customerEmail,
    amountCents: event.priceCents * input.quantity,
    currency: input.currency ?? "EUR",
    quantity: input.quantity,
  })

  return { order, eventTitle: event.title }
}
