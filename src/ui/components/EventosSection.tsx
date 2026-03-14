import { getEvents } from "@/adapters/cms/getEvents"
import { getTranslations, getLocale } from "next-intl/server"
import EventosGrid from "@/ui/components/EventosGrid"
import type { EventGridItem } from "@/ui/components/EventosGrid"
import type { Locale } from "@/i18n/routing"

export const dynamic = "force-dynamic"

/**
 * EventosSection — Festival lineup.
 *
 * Source-of-truth strategy (via getEvents orchestrator):
 *   1. Sanity CMS (if configured) → richest data, localized
 *   2. PostgreSQL database → existing DB events
 *   3. Config file (src/config/events.ts) → hardcoded fallback
 *
 * Each level enriches or falls back to the next.
 * The template works with ZERO external services.
 */
export default async function EventosSection() {
  const t = await getTranslations("events")
  const locale = (await getLocale()) as Locale

  const events = await getEvents(locale)

  const lineupItems: EventGridItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    highlight: e.highlight,
    ticketUrl: e.ticketUrl,
    description: e.description,
    logo: e.logo,
    eventDate: e.eventDate,
    time: e.time,
  }))

  return (
    <section id="programacion" className="festival-horizon-texture py-24 px-6">
      <div className="max-w-6xl mx-auto space-y-16">
        <h2 className="editorial-h2 text-center">{t("heading")}</h2>
        <EventosGrid events={lineupItems} />
      </div>
    </section>
  )
}
