/**
 * Stripe Checkout session creation adapter.
 *
 * Creates hosted Checkout sessions for event ticket purchases.
 * Delegates PCI compliance entirely to Stripe (ADR-003).
 */

import type Stripe from "stripe"
import { requireStripe } from "./client"
import { SITE_URL, SITE_NAME } from "@/config/site"

export interface CreateCheckoutParams {
  orderId: string
  eventId: string
  eventTitle: string
  customerEmail: string
  amountCents: number
  currency: string
  quantity: number
  locale: string
}

export interface CheckoutResult {
  sessionId: string
  url: string
}

/**
 * Create a Stripe Checkout session for event ticket purchase.
 *
 * Returns the session URL for client-side redirect.
 * The orderId is stored in metadata for webhook reconciliation.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CheckoutResult> {
  const stripe = requireStripe()

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    locale: mapLocale(params.locale),
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountCents,
          product_data: {
            name: params.eventTitle,
            description: `Ticket × ${params.quantity} — ${SITE_NAME}`,
          },
        },
        quantity: params.quantity,
      },
    ],
    metadata: {
      orderId: params.orderId,
      eventId: params.eventId,
      platform: SITE_NAME,
    },
    success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/checkout/cancel`,
  })

  if (!session.url) {
    throw new Error("Stripe Checkout session created without URL")
  }

  return {
    sessionId: session.id,
    url: session.url,
  }
}

/** Map our locale codes to Stripe-supported locales */
function mapLocale(locale: string): Stripe.Checkout.SessionCreateParams.Locale {
  const map: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
    es: "es",
    en: "en",
  }
  return map[locale] ?? "auto"
}
