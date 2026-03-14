import { type NextRequest, NextResponse } from "next/server"
import {
  verifyAndHandleWebhook,
  WebhookVerificationError,
} from "@/adapters/payments/stripe/webhooks"

/**
 * POST /api/v1/webhooks/stripe
 *
 * Stripe webhook endpoint. Uses raw body for signature verification.
 * This route is excluded from CSRF protection in middleware.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    )
  }

  try {
    const body = await req.text()
    const result = await verifyAndHandleWebhook(body, signature)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error(
      "[stripe-webhook] Error:",
      err instanceof Error ? err.message : err,
    )
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    )
  }
}
