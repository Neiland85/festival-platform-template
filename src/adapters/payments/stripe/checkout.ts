/**
 * Create a Stripe Checkout Session for event ticket purchase.
 *
 * Returns the checkout URL for client redirect.
 * Throws if Stripe is not configured.
 */
import { stripe, isStripeConfigured } from "./client"
import { setStripeSessionId } from "@/adapters/db/order-repository"

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.")
    this.name = "StripeNotConfiguredError"
  }
}

type CheckoutParams = {
  orderId: string
  eventId: string
  eventTitle: string
  amountCents: number
  currency?: string
  quantity?: number
  customerEmail: string
  locale: string
  successUrl: string
  cancelUrl: string
}

export async function createCheckoutSession(params: CheckoutParams): Promise<string> {
  if (!isStripeConfigured || !stripe) {
    throw new StripeNotConfiguredError()
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.customerEmail,
    locale: params.locale === "es" ? "es" : "en",
    line_items: [
      {
        price_data: {
          currency: params.currency ?? "EUR",
          unit_amount: params.amountCents,
          product_data: {
            name: params.eventTitle,
            metadata: { eventId: params.eventId },
          },
        },
        quantity: params.quantity ?? 1,
      },
    ],
    metadata: {
      orderId: params.orderId,
      eventId: params.eventId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })

  // Link Stripe session to our order
  await setStripeSessionId(params.orderId, session.id)

  if (!session.url) {
    throw new Error("Stripe session created but no URL returned")
  }

  return session.url
}
