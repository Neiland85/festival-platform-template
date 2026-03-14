"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { trackEvent } from "@/lib/tracking"

type Props = {
  eventId: string
  eventTitle: string
  priceCents: number
  locale: string
}

/**
 * Stripe Checkout button.
 *
 * Collects email, creates an order via /api/v1/checkout,
 * and redirects to Stripe's hosted checkout page.
 *
 * Only rendered when Stripe is configured AND the event has a price.
 */
export function StripeCheckoutButton({ eventId, eventTitle, priceCents, locale }: Props) {
  const t = useTranslations("checkout")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceFormatted = (priceCents / 100).toFixed(2)

  async function handleCheckout() {
    if (!email) {
      setError(t("emailRequired"))
      return
    }

    setLoading(true)
    setError(null)

    try {
      trackEvent("checkout_initiated", { eventId, eventTitle })

      const res = await fetch("/api/v1/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, email, locale }),
      })

      const data = (await res.json()) as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed")
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch {
      setError("Network error")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-(--sn-radius-xl) border border-(--sn-border)
          bg-(--sn-surface)/70 backdrop-blur p-6 space-y-4"
      >
        <div className="text-center space-y-1">
          <p className="text-lg font-medium tracking-wide">
            {t("price", { price: priceFormatted })}
          </p>
          <p className="text-xs text-(--sn-muted)">
            {t("stripePayment")}
          </p>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="w-full px-4 py-3 bg-black/20 border border-(--sn-border)
            rounded-(--sn-radius-lg) text-sm text-white placeholder:text-(--sn-muted)
            focus:outline-none focus:border-white/50 transition"
        />

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full border-2 border-white px-8 py-3
            text-sm font-medium tracking-widest uppercase
            hover:bg-white hover:text-black transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("processing") : t("buyTicket")}
        </button>
      </div>
    </div>
  )
}
