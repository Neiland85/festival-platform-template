/**
 * Stripe webhook handler adapter.
 *
 * Verifies signatures and dispatches to domain layer.
 *
 * Security properties:
 * - Signature verification via Stripe SDK (HMAC-SHA256 under the hood)
 * - Idempotency guard by event.id prevents duplicate processing
 * - Raw body verification (never JSON-parsed before signature check)
 * - Structured audit logging with event metadata
 *
 * Why raw body matters:
 *   Stripe signs the EXACT bytes sent in the HTTP body. If those bytes
 *   are parsed to JSON and re-serialized (e.g., via request.json()),
 *   whitespace, key ordering, or unicode escaping may differ → signature
 *   mismatch → 400. Always use req.arrayBuffer() or req.text() to get
 *   the untouched payload before passing it to constructEvent().
 */

import type Stripe from "stripe"
import { requireStripe } from "./client"
import { completeOrder } from "@/domain/orders/complete-order"
import { cancelOrder } from "@/domain/orders/cancel-order"
import { checkIdempotencyKey } from "@/lib/security/idempotency"
import { log } from "@/lib/logger"

// ── Error types ─────────────────────────────────────

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WebhookVerificationError"
  }
}

export class WebhookIdempotencyHit extends Error {
  constructor(eventId: string) {
    super(`Duplicate event: ${eventId}`)
    this.name = "WebhookIdempotencyHit"
  }
}

// ── Types ────────────────────────────────────────────

export type WebhookResult = {
  handled: boolean
  type: string
  eventId: string
  duplicate: boolean
  durationMs: number
}

// ── Public API ───────────────────────────────────────

/**
 * Verify Stripe webhook signature, check idempotency, and handle the event.
 *
 * @param rawBody - Raw request body (untouched bytes as string or Buffer)
 * @param signature - Stripe-Signature header value
 * @returns Result with event metadata and processing status
 * @throws WebhookVerificationError if signature is invalid or secret missing
 */
export async function verifyAndHandleWebhook(
  rawBody: string | Buffer,
  signature: string,
): Promise<WebhookResult> {
  const startMs = performance.now()
  const stripe = requireStripe()

  // ── 1. Validate webhook secret exists ──
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]
  if (!webhookSecret) {
    throw new WebhookVerificationError(
      "STRIPE_WEBHOOK_SECRET not configured",
    )
  }

  // ── 2. Verify signature (constant-time HMAC under the hood) ──
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    throw new WebhookVerificationError(
      `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const eventMeta = {
    eventId: event.id,
    type: event.type,
    created: new Date(event.created * 1000).toISOString(),
    apiVersion: event.api_version,
  }

  log("info", "stripe_webhook_received", eventMeta)

  // ── 3. Idempotency guard by event.id ──
  //
  // Stripe may deliver the same event multiple times (network retries,
  // endpoint timeouts). We deduplicate at the webhook layer using
  // event.id as the idempotency key.
  //
  // This is a first-pass guard. The domain layer (completeOrder, etc.)
  // also enforces idempotency via order status checks — defense in depth.
  //
  const isDuplicate = await checkIdempotencyKey(event.id)
  if (isDuplicate) {
    const durationMs = Math.round(performance.now() - startMs)
    log("info", "stripe_webhook_duplicate", { ...eventMeta, durationMs })
    return {
      handled: false,
      type: event.type,
      eventId: event.id,
      duplicate: true,
      durationMs,
    }
  }

  // ── 4. Dispatch to domain handlers ──
  let handled = false

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.["orderId"]
      if (orderId) {
        await completeOrder(session.id)
        log("info", "stripe_checkout_completed", {
          ...eventMeta,
          stripeSessionId: session.id,
          orderId,
          amountTotal: session.amount_total,
          currency: session.currency,
        })
      } else {
        log("warn", "stripe_checkout_no_order_id", {
          ...eventMeta,
          stripeSessionId: session.id,
        })
      }
      handled = true
      break
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent
      const orderId = intent.metadata?.["orderId"]
      log("info", "stripe_payment_succeeded", {
        ...eventMeta,
        paymentIntentId: intent.id,
        orderId: orderId ?? null,
        amount: intent.amount,
        currency: intent.currency,
      })
      // PaymentIntent succeeded is typically informational when using
      // Checkout Sessions (checkout.session.completed is the trigger).
      // If using PaymentIntents directly, wire fulfillment here.
      if (orderId) {
        await completeOrder(intent.id)
      }
      handled = true
      break
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.["orderId"]
      if (orderId) {
        await cancelOrder(session.id)
        log("info", "stripe_checkout_expired", {
          ...eventMeta,
          stripeSessionId: session.id,
          orderId,
        })
      }
      handled = true
      break
    }

    default:
      log("info", "stripe_webhook_unhandled", eventMeta)
      break
  }

  const durationMs = Math.round(performance.now() - startMs)

  log("info", "stripe_webhook_processed", {
    ...eventMeta,
    handled,
    durationMs,
  })

  return {
    handled,
    type: event.type,
    eventId: event.id,
    duplicate: false,
    durationMs,
  }
}
