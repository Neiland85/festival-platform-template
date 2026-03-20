"use client"

import { useState } from "react"
import Link from "next/link"

/**
 * PricingSection — 3-tier pricing grid.
 *
 * Indie & Business → Stripe checkout via POST /api/checkout
 * Enterprise → /contacto (no Stripe product)
 *
 * Palette: matches existing dark theme (#09090b bg, orange-500 accent).
 */

const TIERS = [
  {
    id: "indie",
    name: "Indie",
    price: "$29",
    period: "one-time",
    description: "For solo creators launching their first event.",
    features: [
      "1 developer",
      "1 project",
      "12 months updates",
      "Community support",
      "All core features",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    id: "business",
    name: "Business",
    price: "$79",
    period: "one-time",
    description: "For teams and agencies running multiple events.",
    features: [
      "Up to 5 developers",
      "Unlimited projects",
      "Client work included",
      "Priority GitHub issues",
      "Early access to updates",
    ],
    cta: "Get started",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale festivals that need white-glove support.",
    features: [
      "Unlimited developers",
      "Custom integrations",
      "Dedicated infrastructure",
      "SLA-backed support",
      "Onboarding sessions",
    ],
    cta: "Book a demo",
    highlight: false,
  },
] as const

export default function PricingSection() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(tier: string) {
    if (tier === "enterprise") return // handled by Link
    setLoading(tier)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[pricing] checkout error:", err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <section id="pricing" className="bg-[#09090b] text-gray-100 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            One-time payment. No subscriptions. Deploy your festival platform today.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-8 flex flex-col ${
                tier.highlight
                  ? "bg-white/[0.06] border-2 border-orange-500/40 shadow-[0_0_40px_-12px_rgba(249,115,22,0.15)]"
                  : "bg-white/[0.03] border border-white/5"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white
                  text-xs font-bold tracking-wider uppercase px-4 py-1 rounded-full">
                  Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
                <p className="text-gray-500 text-sm">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                {tier.period && (
                  <span className="text-gray-500 text-sm ml-2">{tier.period}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {tier.id === "enterprise" ? (
                <Link
                  href="/contacto"
                  className={`block w-full text-center py-3.5 rounded-xl font-semibold text-sm
                    tracking-wide transition-colors duration-200
                    border border-orange-500/30 text-orange-400 hover:bg-orange-500/10`}
                >
                  {tier.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCheckout(tier.id)}
                  disabled={loading === tier.id}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide
                    transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait
                    ${
                      tier.highlight
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-white/[0.06] hover:bg-white/[0.10] text-white border border-white/10"
                    }`}
                >
                  {loading === tier.id ? "Redirecting…" : tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
