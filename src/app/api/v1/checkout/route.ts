import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createOrderForEvent, InsufficientCapacityError, EventNotFoundError } from "@/domain/orders/create-order"
import { createCheckoutSession, StripeNotConfiguredError } from "@/adapters/payments/stripe/checkout"
import { findEventWithPricing } from "@/adapters/db/event-repository"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { rateLimit } from "@/lib/rate-limit"
import { _getClientIp } from "@/lib/ip"

const checkoutSchema = z.object({
  eventId: z.string().min(1).max(255),
  email: z.string().email().max(255),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  locale: z.enum(["es", "en"]).optional().default("es"),
})

/**
 * POST /api/v1/checkout
 *
 * Creates an order and redirects to Stripe Checkout.
 *
 * Body: { eventId: string, email: string, quantity?: number, locale?: string }
 *
 * Security: CSRF validation + rate limiting (opt-in via env vars).
 * Degradation: Returns 503 if Stripe is not configured.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = _getClientIp(req)
    const allowed = await rateLimit(clientIp)
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      )
    }

    // CSRF validation (opt-in: skipped if CSRF_SECRET not set)
    if (!verifyCsrf(req)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      )
    }

    const raw = await req.json()
    const parsed = checkoutSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const body = parsed.data

    // Look up event pricing
    const event = await findEventWithPricing(body.eventId)
    if (!event || !event.active) {
      return NextResponse.json(
        { error: "Event not found or inactive" },
        { status: 404 },
      )
    }

    if (!event.priceCents || event.priceCents <= 0) {
      return NextResponse.json(
        { error: "Event does not have a price configured" },
        { status: 400 },
      )
    }

    const { quantity, locale } = body

    // Create order in DB
    const order = await createOrderForEvent({
      eventId: body.eventId,
      customerEmail: body.email,
      amountCents: event.priceCents * quantity,
      quantity,
    })

    // Create Stripe Checkout session
    const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000"
    const checkoutUrl = await createCheckoutSession({
      orderId: order.id,
      eventId: body.eventId,
      eventTitle: event.title,
      amountCents: event.priceCents,
      quantity,
      customerEmail: body.email,
      locale,
      successUrl: `${siteUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/${locale}/checkout/cancel`,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 },
      )
    }
    if (err instanceof EventNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof InsufficientCapacityError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }

    console.error("[checkout] Error:", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
