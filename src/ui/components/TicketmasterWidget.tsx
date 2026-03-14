"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { trackEvent } from "@/lib/tracking"
import { StripeCheckoutButton } from "./StripeCheckoutButton"

type Props = {
  eventId: string
  ticketUrl: string
  /** If set and Stripe is configured, shows Stripe checkout instead of Ticketmaster */
  priceCents?: number | null
  /** Current locale for Stripe checkout */
  locale?: string
  /** Event title for Stripe line item */
  eventTitle?: string
}

/**
 * Ticket purchase widget with payment provider degradation:
 *
 *   1. priceCents set + STRIPE configured → StripeCheckoutButton
 *   2. ticketUrl is a Universe/Ticketmaster URL → embedded iframe / direct link
 *   3. No URL and no price → "Coming soon" state
 */
export function TicketmasterWidget({
  eventId,
  ticketUrl,
  priceCents,
  locale = "es",
  eventTitle = "",
}: Props) {
  const t = useTranslations("tickets")
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  const hasRealUrl = ticketUrl && ticketUrl !== "#"
  const hasStripePrice = priceCents != null && priceCents > 0

  // If Stripe price is configured, show Stripe button
  // (StripeCheckoutButton will handle the API call which returns 503 if Stripe is not configured)
  if (hasStripePrice) {
    return (
      <div className="mt-10 space-y-6">
        <StripeCheckoutButton
          eventId={eventId}
          eventTitle={eventTitle}
          priceCents={priceCents}
          locale={locale}
        />
        {/* Fallback to external ticket URL if available */}
        {hasRealUrl && (
          <div className="text-center">
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("ticket_fallback_click", { eventId })}
              className="text-sm text-(--sn-muted) underline hover:text-white transition"
            >
              {t("openNewTab")}
            </a>
          </div>
        )}
      </div>
    )
  }

  // Detect Universe URL and convert to embed format
  const embedUrl = hasRealUrl ? toEmbedUrl(ticketUrl) : null

  return (
    <div className="mt-10 space-y-6">
      {embedUrl && !iframeError ? (
        /* ── Embedded checkout iframe ── */
        <div
          className="rounded-(--sn-radius-xl) border border-(--sn-border)
            bg-(--sn-surface)/70 backdrop-blur overflow-hidden"
        >
          {!iframeLoaded && (
            <div className="flex items-center justify-center h-100">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-(--sn-muted) border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-(--sn-muted)">{t("loading")}</p>
              </div>
            </div>
          )}
          <iframe
            src={embedUrl}
            title={t("buyTitle", { eventId })}
            className={`w-full border-0 transition-opacity duration-300 ${
              iframeLoaded ? "opacity-100" : "opacity-0 h-0"
            }`}
            style={iframeLoaded ? { height: "500px" } : undefined}
            allow="payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => {
              setIframeLoaded(true)
              trackEvent("ticket_widget_loaded", { eventId })
            }}
            onError={() => {
              setIframeError(true)
            }}
          />
        </div>
      ) : hasRealUrl ? (
        /* ── Fallback: direct link button (iframe failed or non-embeddable URL) ── */
        <div
          className="rounded-(--sn-radius-xl) border border-(--sn-border)
            bg-(--sn-surface)/70 backdrop-blur p-8 text-center space-y-4"
        >
          <p className="text-sm text-(--sn-muted)">
            {t("officialSale")}
          </p>
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("ticket_direct_click", { eventId })}
            className="inline-block border-2 border-white px-8 py-3
              text-sm font-medium tracking-widest uppercase
              hover:bg-white hover:text-black transition-all duration-300"
          >
            {t("buyButton")}
          </a>
        </div>
      ) : (
        /* ── No URL configured: Coming soon state ── */
        <div
          className="rounded-(--sn-radius-xl) border border-(--sn-border)
            bg-(--sn-surface)/70 backdrop-blur p-8 text-center space-y-3"
        >
          <p className="text-lg font-medium tracking-wide">{t("comingSoonTitle")}</p>
          <p className="text-sm text-(--sn-muted)">
            {t("comingSoonDesc")}
          </p>
        </div>
      )}

      {/* ── Secondary fallback link ── */}
      {hasRealUrl && (
        <div className="text-center">
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("ticket_fallback_click", { eventId })}
            className="text-sm text-(--sn-muted) underline hover:text-white transition"
          >
            {t("openNewTab")}
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * Converts a Universe or Ticketmaster URL to its embeddable format.
 * Supports:
 *   - universe.com/events/SLUG → embed2 checkout
 *   - ticketmaster.es/event/ID → direct link (not embeddable, returns null)
 *   - Any other URL → returns null (use direct link fallback)
 */
function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)

    // Universe embed: /events/SLUG → /embed2/events/SLUG/orders/new
    if (parsed.hostname.includes("universe.com")) {
      const match = parsed.pathname.match(/\/events\/([^/]+)/)
      if (match?.[1]) {
        return `https://www.universe.com/embed2/events/${match[1]}/orders/new`
      }
    }

    // Ticketmaster direct links are not iframe-embeddable
    // Return null to trigger the direct-link fallback UI
    return null
  } catch {
    return null
  }
}
