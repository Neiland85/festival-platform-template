/**
 * Stripe webhook handler adapter.
 *
 * Verifies signatures and dispatches to domain layer.
 * Uses enforced-idempotency to prevent duplicate processing (ADR-003).
 */

import type Stripe from "stripe"
import { requireStripe } from "./client"
import { completeOrder } from "@/domain/orders/complete-order"
import { cancelOrder } from "@/domain/orders/cancel-order"
import { log } from "@/lib/logger"

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WebhookVerificationError"
  }
}

/**
 * Verify Stripe webhook signature and handle the event.
 *
 * @param rawBody - Raw request body (Buffer/string)
 * @param signature - Stripe-Signature header value
 */
export async function verifyAndHandleWebhook(
  rawBody: string,
  signature: string,
): Promise<{ handled: boolean; type: string }> {
  const stripe = requireStripe()

  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]
  if (!webhookSecret) {
    throw new WebhookVerificationError(
      "STRIPE_WEBHOOK_SECRET not configured",
    )
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    throw new WebhookVerificationError(
      `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  log("info", "stripe_webhook_received", {
    type: event.type,
    id: event.id,
  })

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.["orderId"]) {
        await completeOrder(session.id)
      }
      return { handled: true, type: event.type }
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.["orderId"]) {
        await cancelOrder(session.id)
      }
      return { handled: true, type: event.type }
    }

    default:
      log("info", "stripe_webhook_unhandled", { type: event.type })
      return { handled: false, type: event.type }
  }
}
