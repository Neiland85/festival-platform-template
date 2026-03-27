/**
 * Use case: Cancel/expire order and release reserved capacity.
 *
 * Called from:
 * - Webhook handler when checkout.session.expired fires
 * - Admin manual cancellation
 * - Expiration cron (defense against lost webhooks)
 *
 * Idempotent: if order is already in a terminal state, this is a no-op.
 *
 * IMPORTANT: Releases capacity that was reserved at order creation time.
 * This is the counterpart to reserveCapacity() in create-order.ts.
 */

import { findByStripeSessionId, updateOrderStatus, findById } from "./order-repository"
import { releaseCapacity } from "./event-repository"
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
 * Cancel order by ID (admin/cron path).
 */
export async function cancelOrderById(orderId: string): Promise<void> {
  const order = await findById(orderId)

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }

  await cancelOrderInternal(order.id, order.eventId, order.quantity, order.status, "cancelled")
}

/**
 * Internal: transition order to terminal state and release capacity.
 */
async function cancelOrderInternal(
  orderId: string,
  eventId: string,
  quantity: number,
  currentStatus: string,
  targetStatus: "expired" | "cancelled",
): Promise<void> {
  // Idempotent: already in terminal state
  if (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "expired") {
    log("info", "order_cancel_noop", {
      orderId,
      currentStatus,
      targetStatus,
    })
    return
  }

  // Release capacity that was reserved at creation time
  if (currentStatus === "reserved") {
    await releaseCapacity(eventId, quantity)
  }

  await updateOrderStatus(orderId, targetStatus)

  log("info", `order_${targetStatus}`, {
    orderId,
    eventId,
    quantity,
    previousStatus: currentStatus,
    capacityReleased: currentStatus === "reserved",
  })
}
