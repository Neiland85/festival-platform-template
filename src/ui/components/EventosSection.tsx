import { findAllEvents } from "@/adapters/db/event-repository"
import { EVENTS } from "@/config/events"
import EventosGrid from "@/ui/components/EventosGrid"
import type { EventGridItem } from "@/ui/components/EventosGrid"

export const dynamic = "force-dynamic"

/**
 * EventosSection — Festival lineup.
 *
 * Source-of-truth strategy:
 *   1. Config EVENTS defines the canonical festival lineup (6 events).
 *   2. DB events can enrich config data (e.g. updated ticketUrl, description).
 *   3. If a DB event shares the same ID as a config event, DB values override.
 *   4. DB-only events (promos, extras) are appended AFTER the lineup,
 *      but only if they have active=true AND a real ticketUrl.
 *   5. If DB is unavailable, config alone is used (graceful degradation).
 */

function toGridItem(e: {
  id: string
  title: string
  highlight: string
  ticketUrl: string
  description?: string | null
  logo?: string | null
  eventDate?: string | null
  time?: string | null
}): EventGridItem {
  return {
    id: e.id,
    title: e.title,
    highlight: e.highlight,
    ticketUrl: e.ticketUrl,
    description: e.description ?? "",
    logo: e.logo ?? null,
    eventDate: e.eventDate ?? null,
    time: e.time ?? null,
  }
}

export default async function EventosSection() {
  /* ── 1. Build canonical lineup from config ── */
  const lineupItems: EventGridItem[] = EVENTS.map((e) =>
    toGridItem({
      id: e.id,
      title: e.title,
      highlight: e.highlight,
      ticketUrl: e.ticketUrl,
      description: e.description,
      logo: e.logo ?? null,
      eventDate: e.date ?? null,
      time: e.time ?? null,
    }),
  )

  /* ── 2. Try to enrich from DB ── */
  try {
    const dbEvents = await findAllEvents()
    const dbMap = new Map(dbEvents.map((e) => [e.id, e]))

    // Enrich lineup: if a DB event matches a config event by ID, override fields
    for (let i = 0; i < lineupItems.length; i++) {
      const dbMatch = dbMap.get(lineupItems[i]!.id)
      if (dbMatch) {
        lineupItems[i] = toGridItem({
          id: dbMatch.id,
          title: dbMatch.title,
          highlight: dbMatch.highlight,
          ticketUrl: dbMatch.ticketUrl,
          description: dbMatch.description,
          logo: null,
          eventDate: null,
          time: lineupItems[i]!.time,
        })
        dbMap.delete(dbMatch.id)
      }
    }

    // Append DB-only events (promos, extras) that have real ticket URLs
    for (const [, dbEvent] of dbMap) {
      if (dbEvent.active && dbEvent.ticketUrl && dbEvent.ticketUrl !== "#") {
        lineupItems.push(
          toGridItem({
            id: dbEvent.id,
            title: dbEvent.title,
            highlight: dbEvent.highlight,
            ticketUrl: dbEvent.ticketUrl,
            description: dbEvent.description,
            logo: null,
            eventDate: null,
            time: null,
          }),
        )
      }
    }
  } catch (err) {
    console.error(
      "[EventosSection] DB unavailable, using config only:",
      err instanceof Error ? err.message : err,
    )
    // lineupItems already populated from config — graceful degradation
  }

  return (
    <section id="programacion" className="solaris-horizon-texture py-24 px-6">
      <div className="max-w-6xl mx-auto space-y-16">
        <h2 className="editorial-h2 text-center">Programación</h2>
        <EventosGrid events={lineupItems} />
      </div>
    </section>
  )
}
