/**
 * POST /api/v1/webhooks/stripe — Stripe webhook receiver.
 *
 * Security:
 *   - Signature verification via Stripe SDK
 *   - CSRF is skipped (configured in middleware.ts)
 *   - Idempotent processing (completeOrder/cancelOrder are idempotent)
 *
 * Must read raw body for signature verification (no JSON parsing).
 */

import { NextRequest, NextResponse } from "next/server"
import {
  verifyAndHandleWebhook,
  WebhookVerificationError,
} from "@/adapters/payments/stripe/webhooks"
import { log } from "@/lib/logger"

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    )
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 },
    )
  }

  try {
    const result = await verifyAndHandleWebhook(rawBody, signature)

    log("info", "stripe_webhook_processed", {
      type: result.type,
      handled: result.handled,
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      log("warn", "stripe_webhook_verification_failed", {
        error: err.message,
      })
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 401 },
      )
    }

    log("error", "stripe_webhook_error", {
      error: err instanceof Error ? err.message : String(err),
    })

    // Return 200 to prevent Stripe from retrying on our errors
    // (the error is on our side, retrying won't help)
    return NextResponse.json({ received: true, error: "Internal processing error" })
  }
}
