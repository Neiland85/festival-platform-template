/**
 * Use case: Cancel order when Stripe checkout session expires.
 *
 * Called from webhook handler when checkout.session.expired fires.
 *
 * Idempotent: if order is already cancelled/completed, this is a no-op.
 */

import { findByStripeSessionId, updateOrderStatus } from "./order-repository"
import { OrderNotFoundError } from "./types"
import { log } from "@/lib/logger"

export async function cancelOrder(stripeSessionId: string): Promise<void> {
  const order = await findByStripeSessionId(stripeSessionId)

  if (!order) {
    throw new OrderNotFoundError(`stripe_session=${stripeSessionId}`)
  }

  // Idempotent: already terminal state
  if (order.status === "completed" || order.status === "cancelled") {
    log("info", "order_cancel_noop", {
      orderId: order.id,
      currentStatus: order.status,
    })
    return
  }

  await updateOrderStatus(order.id, "cancelled")

  log("info", "order_cancelled", {
    orderId: order.id,
    eventId: order.eventId,
    stripeSessionId,
  })
}
