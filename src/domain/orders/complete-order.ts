/**
 * Use case: Complete order after successful Stripe payment.
 *
 * Called from webhook handler when checkout.session.completed fires.
 *
 * Idempotent: if order is already completed, this is a no-op.
 * Increments tickets_sold atomically on the event.
 */

import { findByStripeSessionId, updateOrderStatus } from "./order-repository"
import { incrementTicketsSold } from "./event-repository"
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

  // Mark completed + increment tickets sold (atomically per row)
  await updateOrderStatus(order.id, "completed")
  await incrementTicketsSold(order.eventId, order.quantity)

  log("info", "order_completed", {
    orderId: order.id,
    eventId: order.eventId,
    quantity: order.quantity,
    amountCents: order.amountCents,
  })
}
