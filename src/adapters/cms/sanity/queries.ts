/**
 * GROQ queries for Sanity CMS.
 *
 * All queries are designed to fetch localized fields and return
 * structured data matching the SanityEvent/SanityArtist types.
 */
import { sanityClient, isSanityConfigured } from "./client"
import type { SanityEvent, SanitySiteConfig } from "./types"

/**
 * Fetch all active events from Sanity, ordered by sortOrder.
 * Returns null if Sanity is not configured.
 */
export async function fetchEventsFromSanity(): Promise<SanityEvent[] | null> {
  if (!isSanityConfigured || !sanityClient) return null

  try {
    const events = await sanityClient.fetch<SanityEvent[]>(
      `*[_type == "event" && active == true] | order(sortOrder asc) {
        _id,
        eventId,
        title,
        highlight,
        description,
        eventDate,
        time,
        ticketUrl,
        logo,
        priceCents,
        active,
        sortOrder
      }`,
      {},
      { next: { tags: ["events"] } },
    )
    return events
  } catch (err) {
    console.error(
      "[Sanity] Failed to fetch events:",
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

/**
 * Fetch a single event by its eventId slug.
 * Returns null if Sanity is not configured or event not found.
 */
export async function fetchEventByIdFromSanity(
  eventId: string,
): Promise<SanityEvent | null> {
  if (!isSanityConfigured || !sanityClient) return null

  try {
    const event = await sanityClient.fetch<SanityEvent | null>(
      `*[_type == "event" && eventId == $eventId][0] {
        _id,
        eventId,
        title,
        highlight,
        description,
        eventDate,
        time,
        ticketUrl,
        logo,
        priceCents,
        active,
        sortOrder
      }`,
      { eventId },
      { next: { tags: [`event-${eventId}`] } },
    )
    return event
  } catch (err) {
    console.error(
      `[Sanity] Failed to fetch event ${eventId}:`,
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

/**
 * Fetch the site configuration document.
 * Returns null if Sanity is not configured.
 */
export async function fetchSiteConfigFromSanity(): Promise<SanitySiteConfig | null> {
  if (!isSanityConfigured || !sanityClient) return null

  try {
    const config = await sanityClient.fetch<SanitySiteConfig | null>(
      `*[_type == "siteConfig"][0] {
        _id,
        festivalName,
        tagline,
        dates,
        logo,
        heroVideo,
        social,
        location
      }`,
      {},
      { next: { tags: ["siteConfig"] } },
    )
    return config
  } catch (err) {
    console.error(
      "[Sanity] Failed to fetch site config:",
      err instanceof Error ? err.message : err,
    )
    return null
  }
}
