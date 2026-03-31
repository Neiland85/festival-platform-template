/**
 * Use case: Cancel/expire order and release reserved capacity.
 *
 * ATOMIC: capacity release + status update in one transaction.
 * If either fails, neither takes effect. No double-release possible.
 *
 * STATUS GUARD: cancelOrderInternal uses WHERE status = 'reserved'
 * so concurrent cancel+complete on the same order cannot both succeed.
 *
 * Called from:
 * - Webhook handler when checkout.session.expired fires
 * - Admin manual cancellation
 * - Expiration cron (defense against lost webhooks)
 */

import { getPool } from "@/adapters/db/pool"
import { findByStripeSessionId, findById } from "./order-repository"
import { OrderNotFoundError } from "./types"
import { log } from "@/lib/logger"

/**
 * Cancel order by Stripe session ID (webhook path).
 */
export async function cancelOrder(stripeSessionId: string): Promise<void> {
  const order = await findByStripeSessionId(stripeSessionId)

  if (!order) {
    throw new OrderNotFoundError(`stripe_session=${stripeSessionId}`)
  }

  await cancelOrderInternal(order.id, order.eventId, order.quantity, order.status, "expired")
}

/**
 * Cancel order by ID (admin path).
 */
export async function cancelOrderById(orderId: string): Promise<void> {
  const order = await findById(orderId)

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }

  await cancelOrderInternal(order.id, order.eventId, order.quantity, order.status, "cancelled")
}

/**
 * Expire order by ID (cron path).
 * Same as cancelOrderById but uses "expired" status to distinguish
 * timeout-based expiration from manual admin cancellation.
 */
export async function expireOrderById(orderId: string): Promise<void> {
  const order = await findById(orderId)

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }

  await cancelOrderInternal(order.id, order.eventId, order.quantity, order.status, "expired")
}

/**
 * Internal: atomic transition to terminal state + release capacity.
 *
 * Transaction boundary: releaseCapacity + updateOrderStatus are atomic.
 * Status guard: UPDATE uses WHERE status = 'reserved' — if the row was
 * already transitioned by a concurrent webhook, 0 rows affected → no-op.
 */
async function cancelOrderInternal(
  orderId: string,
  eventId: string,
  quantity: number,
  currentStatus: string,
  targetStatus: "expired" | "cancelled",
): Promise<void> {
  // Idempotent: already in terminal state (no DB hit needed)
  if (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "expired" || currentStatus === "refunded") {
    log("info", "order_cancel_noop", {
      orderId,
      currentStatus,
      targetStatus,
    })
    return
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // ── Status guard: only transition if still "reserved" ──
    // This prevents double-release and the complete-vs-expire race.
    const updateResult = await client.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'reserved'
       RETURNING id`,
      [targetStatus, orderId],
    )

    if (updateResult.rows.length === 0) {
      // Another concurrent operation already transitioned this order.
      // No capacity to release — it was either already released or completed.
      await client.query("ROLLBACK")
      log("info", "order_cancel_race_lost", {
        orderId,
        targetStatus,
        note: "concurrent transition already occurred",
      })
      return
    }

    // ── Release capacity (only reached if status guard passed) ──
    await client.query(
      `UPDATE events
       SET tickets_sold = GREATEST(0, tickets_sold - $1)
       WHERE id = $2`,
      [quantity, eventId],
    )

    await client.query("COMMIT")

    log("info", `order_${targetStatus}`, {
      orderId,
      eventId,
      quantity,
      previousStatus: currentStatus,
      capacityReleased: true,
    })
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
