/**
 * Mark an order as completed after successful payment.
 *
 * Called by the Stripe webhook handler when checkout.session.completed fires.
 * Updates order status and increments tickets_sold on the event.
 */
import {
  findOrderByStripeSession,
  updateOrderStatus,
} from "@/adapters/db/order-repository"
import { incrementTicketsSold } from "@/adapters/db/event-repository"

export class OrderNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Order for Stripe session ${sessionId} not found`)
    this.name = "OrderNotFoundError"
  }
}

export async function completeOrder(stripeSessionId: string): Promise<void> {
  const order = await findOrderByStripeSession(stripeSessionId)
  if (!order) {
    throw new OrderNotFoundError(stripeSessionId)
  }

  if (order.status === "completed") {
    // Idempotent: already completed
    return
  }

  await updateOrderStatus(order.id, "completed")
  await incrementTicketsSold(order.eventId, order.quantity)
}
