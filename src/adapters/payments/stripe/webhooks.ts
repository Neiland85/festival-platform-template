/**
 * Stripe webhook signature verification and event handling.
 *
 * Verifies the webhook signature using STRIPE_WEBHOOK_SECRET
 * and dispatches to the appropriate handler.
 */
import { stripe, isStripeConfigured } from "./client"
import { completeOrder } from "@/domain/orders/complete-order"
import { updateOrderStatus } from "@/adapters/db/order-repository"
import type Stripe from "stripe"

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WebhookVerificationError"
  }
}

export async function verifyAndHandleWebhook(
  body: string,
  signature: string,
): Promise<{ received: true; type: string }> {
  if (!isStripeConfigured || !stripe) {
    throw new WebhookVerificationError("Stripe is not configured")
  }

  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]
  if (!webhookSecret) {
    throw new WebhookVerificationError("STRIPE_WEBHOOK_SECRET not configured")
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    throw new WebhookVerificationError(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown error"}`
    )
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      await completeOrder(session.id)
      break
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.["orderId"]
      if (orderId) {
        await updateOrderStatus(orderId, "cancelled")
      }
      break
    }

    // Add more event types as needed (refunds, disputes, etc.)
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
  }

  return { received: true, type: event.type }
}
