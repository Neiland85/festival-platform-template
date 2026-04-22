/**
 * Use case: Create order for event ticket purchase.
 *
 * ATOMIC CAPACITY RESERVATION — no race conditions:
 *   1. BEGIN transaction
 *   2. Single UPDATE with WHERE guard reserves capacity
 *   3. INSERT order as "reserved"
 *   4. COMMIT (or ROLLBACK on any failure)
 *
 * If the INSERT fails after capacity was reserved, the transaction
 * rolls back and capacity is never deducted. No leaked reservations.
 */

import { getPool } from "@/adapters/db/pool"
import type { Order, OrderStatus } from "./types"
import {
  EventNotFoundError,
  EventNoPriceError,
  CapacitySoldOutError,
} from "./types"
import { randomUUID } from "crypto"

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

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // ── 1. Verify event exists and has pricing ──
    const eventResult = await client.query(
      `SELECT id, title, price_cents, capacity, tickets_sold, active
       FROM events
       WHERE id = $1 AND active = true
       LIMIT 1`,
      [input.eventId],
    )

    if (eventResult.rows.length === 0) {
      throw new EventNotFoundError(input.eventId)
    }

    const event = eventResult.rows[0]
    const priceCents = event["price_cents"] as number | null

    if (priceCents == null) {
      throw new EventNoPriceError(input.eventId)
    }

    // ── 2. Atomic capacity reservation (same transaction) ──
    const reserveResult = await client.query(
      `UPDATE events
       SET tickets_sold = tickets_sold + $1
       WHERE id = $2
         AND active = true
         AND (capacity IS NULL OR tickets_sold + $1 <= capacity)
       RETURNING id`,
      [input.quantity, input.eventId],
    )

    if (reserveResult.rows.length === 0) {
      throw new CapacitySoldOutError(input.eventId)
    }

    // ── 3. Create order as "reserved" (same transaction) ──
    const orderId = randomUUID()
    const now = new Date()
    const status: OrderStatus = "reserved"

    const orderResult = await client.query(
      `INSERT INTO orders (id, event_id, customer_email, amount_cents, currency, status, quantity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [
        orderId,
        input.eventId,
        input.customerEmail,
        priceCents * input.quantity,
        input.currency ?? "EUR",
        status,
        input.quantity,
        now,
      ],
    )

    await client.query("COMMIT")

    const row = orderResult.rows[0]
    const order: Order = {
      id: row["id"] as string,
      stripeSessionId: (row["stripe_session_id"] as string) ?? null,
      eventId: row["event_id"] as string,
      customerEmail: row["customer_email"] as string,
      amountCents: row["amount_cents"] as number,
      currency: row["currency"] as string,
      status: row["status"] as OrderStatus,
      quantity: row["quantity"] as number,
      createdAt: new Date(row["created_at"] as string),
      updatedAt: new Date(row["updated_at"] as string),
    }

    return { order, eventTitle: event["title"] as string }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
