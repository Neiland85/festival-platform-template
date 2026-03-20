/**
 * Order repository — Postgres persistence for orders.
 *
 * Uses raw pg queries (consistent with existing codebase pattern).
 * Schema matches drizzle schema.ts (migration 006).
 */

import { getPool } from "@/adapters/db/pool"
import { randomUUID } from "crypto"
import type { Order, OrderStatus } from "./types"

/**
 * Create a new pending order before redirecting to Stripe Checkout.
 */
export async function createOrder(params: {
  eventId: string
  customerEmail: string
  amountCents: number
  currency: string
  quantity: number
}): Promise<Order> {
  const pool = getPool()
  const id = randomUUID()
  const now = new Date()

  const result = await pool.query(
    `INSERT INTO orders (id, event_id, customer_email, amount_cents, currency, status, quantity, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $7)
     RETURNING *`,
    [id, params.eventId, params.customerEmail, params.amountCents, params.currency, params.quantity, now],
  )

  return mapRow(result.rows[0])
}

/**
 * Link the Stripe session ID to an existing order.
 * Called right after creating the Checkout session.
 */
export async function setStripeSessionId(
  orderId: string,
  stripeSessionId: string,
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE orders SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2`,
    [stripeSessionId, orderId],
  )
}

/**
 * Find an order by Stripe session ID (used in webhook handler).
 */
export async function findByStripeSessionId(
  stripeSessionId: string,
): Promise<Order | null> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM orders WHERE stripe_session_id = $1 LIMIT 1`,
    [stripeSessionId],
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

/**
 * Update order status.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, orderId],
  )
}

// ── Row mapper ──────────────────────────────────────

function mapRow(row: Record<string, unknown>): Order {
  return {
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
}
