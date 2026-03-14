/**
 * Event data orchestrator with graceful degradation.
 *
 * Priority chain:
 *   1. Sanity CMS (if configured) → richest data source
 *   2. PostgreSQL database → existing DB events
 *   3. Config file (src/config/events.ts) → hardcoded fallback
 *
 * Each level enriches or falls back to the next.
 * The template works with ZERO external services.
 */
import { fetchEventsFromSanity } from "./sanity/queries"
import { sanityImageUrl } from "./sanity/image"
import { findAllEvents } from "@/adapters/db/event-repository"
import { EVENTS } from "@/config/events"
import type { Locale } from "@/i18n/routing"

export type CmsEvent = {
  id: string
  title: string
  highlight: string
  description: string
  ticketUrl: string
  logo: string | null
  eventDate: string | null
  time: string | null
  priceCents: number | null
}

/**
 * Fetch events with graceful degradation: Sanity → DB → Config.
 *
 * @param locale - The current locale for localized Sanity fields
 * @returns Array of normalized events
 */
export async function getEvents(locale: Locale = "es"): Promise<CmsEvent[]> {
  // ── 1. Try Sanity CMS ──
  const sanityEvents = await fetchEventsFromSanity()

  if (sanityEvents && sanityEvents.length > 0) {
    return sanityEvents.map((e) => ({
      id: e.eventId,
      title: e.title?.[locale] ?? e.title?.es ?? e.eventId,
      highlight: e.highlight?.[locale] ?? e.highlight?.es ?? "",
      description: e.description?.[locale] ?? e.description?.es ?? "",
      ticketUrl: e.ticketUrl ?? "#",
      logo: sanityImageUrl(e.logo, 400),
      eventDate: e.eventDate ?? null,
      time: e.time ?? null,
      priceCents: e.priceCents ?? null,
    }))
  }

  // ── 2. Try PostgreSQL database ──
  try {
    const dbEvents = await findAllEvents()
    if (dbEvents.length > 0) {
      // Merge DB with config for enrichment
      const configMap = new Map(EVENTS.map((e) => [e.id, e]))

      return dbEvents
        .filter((e) => e.active)
        .map((e) => {
          const configMatch = configMap.get(e.id)
          return {
            id: e.id,
            title: e.title,
            highlight: e.highlight,
            description: e.description ?? configMatch?.description ?? "",
            ticketUrl: e.ticketUrl,
            logo: configMatch?.logo ?? null,
            eventDate: configMatch?.date ?? null,
            time: configMatch?.time ?? null,
            priceCents: null,
          }
        })
    }
  } catch (err) {
    console.error(
      "[getEvents] DB unavailable, falling back to config:",
      err instanceof Error ? err.message : err,
    )
  }

  // ── 3. Fallback to config file ──
  return EVENTS.map((e) => ({
    id: e.id,
    title: e.title,
    highlight: e.highlight,
    description: e.description ?? "",
    ticketUrl: e.ticketUrl,
    logo: e.logo ?? null,
    eventDate: e.date ?? null,
    time: e.time ?? null,
    priceCents: null,
  }))
}
