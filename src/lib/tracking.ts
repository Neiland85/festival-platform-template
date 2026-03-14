declare global {
  interface Window {
    gtag?: (command: string, name: string, payload?: Record<string, unknown>) => void
    fbq?: (command: string, name: string, payload?: Record<string, unknown>) => void
  }
}

/**
 * Standard Meta Pixel events that Meta Ads can optimize for.
 * Map internal event names → Meta standard event names.
 */
const META_STANDARD_EVENTS: Record<string, string> = {
  lead_captured: "Lead",
  view_event: "ViewContent",
  initiate_checkout: "InitiateCheckout",
  purchase: "Purchase",
  add_to_cart: "AddToCart",
  search: "Search",
}

/**
 * Track an event across GA4 and Meta Pixel.
 *
 * If `name` maps to a Meta standard event, uses `fbq('track', ...)`.
 * Otherwise falls back to `fbq('trackCustom', ...)`.
 */
export function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return

  // GA4
  if (window.gtag) {
    window.gtag("event", name, payload)
  }

  // Meta Pixel — prefer standard events for Ads optimization
  if (window.fbq) {
    const standardEvent = META_STANDARD_EVENTS[name]
    if (standardEvent) {
      window.fbq("track", standardEvent, payload)
    } else {
      window.fbq("trackCustom", name, payload)
    }
  }

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.log("Tracking:", name, payload)
  }
}

/**
 * Convenience: track a Lead conversion (email capture).
 */
export function trackLead(eventId: string, email?: string) {
  trackEvent("lead_captured", {
    content_name: eventId,
    content_category: "festival_event",
    ...(email ? { value: 1, currency: "EUR" } : {}),
  })
}

/**
 * Convenience: track ViewContent (event detail page view).
 */
export function trackViewContent(eventId: string, eventTitle: string) {
  trackEvent("view_event", {
    content_ids: [eventId],
    content_name: eventTitle,
    content_type: "event",
    content_category: "festival_event",
  })
}
