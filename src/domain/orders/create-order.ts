/**
 * Use case: Create order for event ticket purchase.
 *
 * ATOMIC CAPACITY RESERVATION — no race conditions:
 *   1. Single UPDATE with WHERE guard reserves capacity
 *   2. If UPDATE returns 0 rows → sold out (atomic, no TOCTOU)
 *   3. Order created as "reserved" (capacity already deducted)
 *
 * On payment success (webhook): status → "completed" (no capacity change)
 * On expiration (webhook/cron): status → "expired" + capacity released
 */

import { findEventWithPricing, reserveCapacity } from "./event-repository"
import { createOrder } from "./order-repository"
import type { Order } from "./types"
import {
  EventNotFoundError,
  EventNoPriceError,
  CapacitySoldOutError,
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
  // ── Input validation ──
  if (!input.eventId || typeof input.eventId !== "string") {
    throw new Error("eventId is required")
  }
  if (!input.customerEmail || typeof input.customerEmail !== "string") {
    throw new Error("customerEmail is required")
  }
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 10
  ) {
    throw new Error("quantity must be an integer between 1 and 10")
  }

  // ── 1. Verify event exists and has pricing ──
  const event = await findEventWithPricing(input.eventId)

  if (!event) {
    throw new EventNotFoundError(input.eventId)
  }

  if (event.priceCents == null) {
    throw new EventNoPriceError(input.eventId)
  }

  // ── 2. Atomic capacity reservation ──
  // Single UPDATE with WHERE guard: tickets_sold + qty <= capacity
  // PostgreSQL row-level lock serializes concurrent writes.
  // If returns null → sold out (0 rows affected).
  const reserved = await reserveCapacity(input.eventId, input.quantity)

  if (!reserved) {
    throw new CapacitySoldOutError(input.eventId)
  }

  // ── 3. Create order as "reserved" (capacity already deducted) ──
  const order = await createOrder({
    eventId: input.eventId,
    customerEmail: input.customerEmail,
    amountCents: event.priceCents * input.quantity,
    currency: input.currency ?? "EUR",
    quantity: input.quantity,
    status: "reserved",
  })

  return { order, eventTitle: event.title }
}
