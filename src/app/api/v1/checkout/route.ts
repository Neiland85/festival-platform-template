/**
 * POST /api/v1/checkout — Create Stripe Checkout session for event tickets.
 *
 * Flow:
 *   1. Rate limit by IP
 *   2. Verify CSRF token
 *   3. Validate input (eventId, email, quantity)
 *   4. createOrderForEvent() — validates event, capacity, price
 *   5. createCheckoutSession() — creates Stripe hosted session
 *   6. Link session ID to order
 *   7. Return redirect URL
 *
 * Security: rate-limited + CSRF protected (ADR-003).
 * Degrades to 503 if Stripe not configured (ADR-004).
 */

import { NextRequest, NextResponse } from "next/server"
import { rateLimit, setRateLimitHeaders } from "@/lib/rate-limit"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { createOrderForEvent } from "@/domain/orders/create-order"
import { setStripeSessionId } from "@/domain/orders/order-repository"
import { createCheckoutSession } from "@/adapters/payments/stripe/checkout"
import { StripeNotConfiguredError } from "@/adapters/payments/stripe/client"
import {
  EventNotFoundError,
  EventNoPriceError,
  InsufficientCapacityError,
} from "@/domain/orders/types"
import { log } from "@/lib/logger"

export async function POST(req: NextRequest) {
  // 1. Rate limit — check BEFORE CSRF (cheaper check first)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = await rateLimit(ip)
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    )
    setRateLimitHeaders(res.headers, rl)
    return res
  }

  // 2. CSRF
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 },
    )
  }

  // 3. Parse and validate input
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  const eventId = body["eventId"]
  const email = body["email"]
  const quantity = typeof body["quantity"] === "number" ? body["quantity"] : 1
  const locale = typeof body["locale"] === "string" ? body["locale"] : "es"

  if (typeof eventId !== "string" || typeof email !== "string") {
    return NextResponse.json(
      { error: "eventId and email are required" },
      { status: 400 },
    )
  }

  try {
    // 4. Create order (validates event, capacity, price)
    const { order, eventTitle } = await createOrderForEvent({
      eventId,
      customerEmail: email,
      quantity,
    })

    // 5. Create Stripe Checkout session
    const { sessionId, url } = await createCheckoutSession({
      orderId: order.id,
      eventId,
      eventTitle,
      customerEmail: email,
      amountCents: order.amountCents,
      currency: order.currency,
      quantity,
      locale,
    })

    // 6. Link session ID to order
    await setStripeSessionId(order.id, sessionId)

    log("info", "checkout_session_created", {
      orderId: order.id,
      eventId,
      sessionId,
    })

    // 7. Return URL for client redirect
    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { error: "Payment system not available" },
        { status: 503 },
      )
    }

    if (err instanceof EventNotFoundError) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 },
      )
    }

    if (err instanceof EventNoPriceError) {
      return NextResponse.json(
        { error: "Event does not have a price configured" },
        { status: 400 },
      )
    }

    if (err instanceof InsufficientCapacityError) {
      return NextResponse.json(
        { error: "Not enough tickets available" },
        { status: 409 },
      )
    }

    log("error", "checkout_failed", {
      error: err instanceof Error ? err.message : String(err),
      eventId,
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
