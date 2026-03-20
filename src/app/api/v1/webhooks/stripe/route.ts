/**
 * POST /api/v1/webhooks/stripe — Stripe webhook receiver.
 *
 * Security:
 *   - Signature verification via Stripe SDK (HMAC-SHA256)
 *   - CSRF is skipped in middleware.ts (Stripe uses its own signature scheme)
 *   - Idempotent by event.id (webhook layer) + order status (domain layer)
 *   - Raw body read via arrayBuffer() — NEVER via request.json()
 *
 * Why NOT request.json():
 *   Stripe signs the raw HTTP body bytes. JSON.parse() + JSON.stringify()
 *   can alter whitespace, key order, unicode escapes, or number precision.
 *   Any byte-level difference causes constructEvent() to reject the signature.
 *   Using arrayBuffer() → Buffer preserves the exact bytes Stripe signed.
 *
 *   Example of what breaks:
 *     Stripe sends: {"amount": 1000, "id": "evt_xxx"}
 *     JSON.parse → JSON.stringify might produce: {"id":"evt_xxx","amount":1000}
 *     → Different bytes → HMAC mismatch → 400
 *
 * Response strategy:
 *   - 400 for missing signature or body read failure
 *   - 400 for signature verification failure (malformed payload, not auth)
 *   - 200 for successful processing OR internal errors
 *   Why 200 on internal errors? Returning 4xx/5xx makes Stripe retry.
 *   If the error is on our side (DB down, bug), retrying the same payload
 *   won't help and generates unnecessary load. Better to 200-ack and
 *   handle the failure via observability/alerts.
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
    log("warn", "stripe_webhook_missing_signature", {
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent"),
    })
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    )
  }

  // ── Read raw body as Buffer (preserves exact signed bytes) ──
  let rawBody: Buffer
  try {
    const arrayBuf = await req.arrayBuffer()
    rawBody = Buffer.from(arrayBuf)
  } catch (err) {
    log("error", "stripe_webhook_body_read_failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 },
    )
  }

  if (rawBody.length === 0) {
    log("warn", "stripe_webhook_empty_body")
    return NextResponse.json(
      { error: "Empty request body" },
      { status: 400 },
    )
  }

  try {
    const result = await verifyAndHandleWebhook(rawBody, signature)

    if (result.duplicate) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        eventId: result.eventId,
      })
    }

    return NextResponse.json({
      received: true,
      eventId: result.eventId,
      handled: result.handled,
    })
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      log("warn", "stripe_webhook_verification_failed", {
        error: err.message,
      })
      // 400, not 401 — this is a malformed/tampered payload, not an auth issue.
      // Stripe retries on 4xx, which is correct here: the request itself is bad.
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 400 },
      )
    }

    log("error", "stripe_webhook_processing_error", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })

    // 200-ack to prevent Stripe retries on OUR errors.
    // The event is valid (signature passed), so retrying won't fix our bug.
    // Observability alerts handle the follow-up.
    return NextResponse.json({
      received: true,
      error: "Internal processing error",
    })
  }
}
