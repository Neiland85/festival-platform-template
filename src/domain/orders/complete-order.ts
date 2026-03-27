/**
 * Use case: Complete order after successful Stripe payment.
 *
 * Called from webhook handler when checkout.session.completed fires.
 *
 * Idempotent: if order is already completed, this is a no-op.
 *
 * IMPORTANT: Does NOT modify capacity. Capacity was already reserved
 * atomically at order creation time (create-order.ts).
 * This use case only transitions: reserved → completed.
 */

import { findByStripeSessionId, updateOrderStatus } from "./order-repository"
import { OrderNotFoundError } from "./types"
import { log } from "@/lib/logger"

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

  // Only transition from "reserved" → "completed"
  if (order.status !== "reserved") {
    log("warn", "order_complete_invalid_state", {
      orderId: order.id,
      currentStatus: order.status,
      stripeSessionId,
    })
    return
  }

  await updateOrderStatus(order.id, "completed")

  log("info", "order_completed", {
    orderId: order.id,
    eventId: order.eventId,
    quantity: order.quantity,
    amountCents: order.amountCents,
  })
}
