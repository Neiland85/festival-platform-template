import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for template license purchases.
 * Expects JSON body: { tier: "indie" | "business" | "enterprise" }
 *
 * Requires env vars:
 *   STRIPE_SECRET_KEY
 *   NEXT_PUBLIC_SITE_URL  (for redirect URLs)
 *
 * Enterprise tier returns a redirect to contact form (no self-serve checkout).
 */

const VALID_TIERS = ["indie", "business", "enterprise"] as const
type Tier = (typeof VALID_TIERS)[number]

const CHECKOUT_TIERS: Record<
  "indie" | "business",
  { name: string; priceUsd: number; description: string }
> = {
  indie: {
    name: "Festival Platform — Indie License",
    priceUsd: 2_900,
    description: "1 developer, 1 project, 12 months updates",
  },
  business: {
    name: "Festival Platform — Business License",
    priceUsd: 7_900,
    description: "Up to 5 developers, unlimited projects, client work included",
  },
}

function isValidTier(tier: string): tier is Tier {
  return VALID_TIERS.includes(tier as Tier)
}

export async function POST(req: NextRequest) {
  // ── 1. Parse body ─────────────────────────────────────────────
  let body: { tier?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const tier = body.tier?.toLowerCase() ?? ""

  // ── 2. Validate tier ──────────────────────────────────────────
  if (!isValidTier(tier)) {
    return NextResponse.json(
      { error: `Invalid tier. Expected: ${VALID_TIERS.join(", ")}` },
      { status: 400 }
    )
  }

  // ── 3. Enterprise → contact form (no Stripe checkout) ─────────
  if (tier === "enterprise") {
    const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] || "http://localhost:3000"
    return NextResponse.json({ url: `${siteUrl}/contacto` })
  }

  // ── 4. Validate Stripe config ─────────────────────────────────
  const stripeKey = process.env["STRIPE_SECRET_KEY"]
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local" },
      { status: 503 }
    )
  }

  // ── 5. Create Stripe Checkout Session ─────────────────────────
  const config = CHECKOUT_TIERS[tier]
  const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] || "http://localhost:3000"
  const stripe = new Stripe(stripeKey)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: config.priceUsd * 100, // Stripe expects cents
            product_data: {
              name: config.name,
              description: config.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#pricing`,
      metadata: {
        tier,
        product: "festival-platform-template",
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[checkout] Stripe error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
