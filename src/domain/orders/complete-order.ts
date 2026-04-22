/**
 * Use case: Complete order after successful Stripe payment.
 *
 * Called from webhook handler when checkout.session.completed fires.
 *
 * STATUS GUARD: UPDATE uses WHERE status = 'reserved'.
 * If a concurrent cancel/expire already transitioned the order,
 * this returns 0 rows → no-op. Prevents the complete-vs-expire race.
 *
 * Does NOT modify capacity — it was already reserved at order creation.
 */

import { getPool } from "@/adapters/db/pool"
import { findByStripeSessionId } from "./order-repository"
import { OrderNotFoundError } from "./types"
import { log } from "@/lib/logger"
import { recordSpudOutcome } from "@/adapters/db/spud-outcome-hook"
import { createOffchainTicketAsset } from "@/adapters/tickets/ticket-asset-repository"

export async function completeOrder(stripeSessionId: string): Promise<void> {
  const order = await findByStripeSessionId(stripeSessionId)

  if (!order) {
    throw new OrderNotFoundError(`stripe_session=${stripeSessionId}`)
  }

  // Idempotent: already completed
  if (order.status === "completed") {
    log("info", "order_already_completed", {
      orderId: order.id,
      stripeSessionId,
    })
    return
  }

  // Reject if not in reservable state
  if (order.status !== "reserved") {
    log("warn", "order_complete_invalid_state", {
      orderId: order.id,
      currentStatus: order.status,
      stripeSessionId,
    })
    return
  }

  // ── Status guard at DB level ──
  // WHERE status = 'reserved' ensures that if a concurrent cancel/expire
  // already transitioned this order, we get 0 rows and do nothing.
  const pool = getPool()
  const result = await pool.query(
    `UPDATE orders
     SET status = 'completed', updated_at = NOW()
     WHERE id = $1 AND status = 'reserved'
     RETURNING id`,
    [order.id],
  )

  if (result.rows.length === 0) {
    // Race lost: order was cancelled/expired between our SELECT and UPDATE.
    log("warn", "order_complete_race_lost", {
      orderId: order.id,
      stripeSessionId,
      note: "order was already transitioned by concurrent operation",
    })
    return
  }

  await createOffchainTicketAsset({
    orderId: order.id,
    eventId: order.eventId,
    ownerEmail: order.customerEmail,
  })

  log("info", "order_completed", {
    orderId: order.id,
    eventId: order.eventId,
    quantity: order.quantity,
    amountCents: order.amountCents,
    ticketAssetProvisioned: true,
  })

  // ── SPUD outcome tracking (fire-and-forget, never blocks) ──
  recordSpudOutcome(order.customerEmail, order.id, order.eventId)
}
