"use client"

import { useState, useCallback, useMemo } from "react"
import EventCardFestival from "@/ui/components/EventCardFestival"
import ArtistModal from "@/ui/components/ArtistModal"
import StickyMobileCTA from "@/ui/components/StickyMobileCTA"

/**
 * EventosGrid — Client wrapper that manages modal state + sticky mobile CTA.
 *
 * Receives serialized event data from the server component (EventosSection)
 * and provides selectedArtist / isModalOpen state management.
 */

export type EventGridItem = {
  id: string
  title: string
  highlight: string
  ticketUrl: string
  description: string
  logo?: string | null
  eventDate?: string | null
  time?: string | null
}

type Props = {
  events: EventGridItem[]
}

/** Artist background images keyed by event ID */
const ARTIST_IMAGES: Record<string, string> = {
  chambao: "/events/chambao.jpg",
  bresh: "/events/bresh.jpg",
  ohsee: "/events/ohsee.jpg",
  goa: "/events/goa.jpg",
  tropicalia: "/events/tropicalia.png",
  tecnoflamenco: "/events/tecnoflamenco.png",
}

/** Custom object-position overrides per event (default: "center 25%") */
const ARTIST_IMAGE_POSITIONS: Record<string, string> = {
  bresh: "center 50%",
  tropicalia: "center center",
  tecnoflamenco: "center center",
}

/** Events that use poster/logo images instead of photos */
const ARTIST_IMAGE_FITS: Record<string, "cover" | "contain"> = {
  tropicalia: "contain",
  tecnoflamenco: "contain",
}

/** Background colors for contain-fit images */
const ARTIST_IMAGE_BGS: Record<string, string> = {
  tropicalia: "#FFF0E8",
  tecnoflamenco: "#ffffff",
}

export default function EventosGrid({ events }: Props) {
  const [selectedArtist, setSelectedArtist] = useState<EventGridItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSelect = useCallback((event: EventGridItem) => {
    setSelectedArtist(event)
    setIsModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsModalOpen(false)
    const t = setTimeout(() => setSelectedArtist(null), 300)
    return () => clearTimeout(t)
  }, [])

  /* First event with a real ticket URL — used by sticky mobile CTA */
  const headliner = useMemo(
    () => events.find((e) => e.ticketUrl && e.ticketUrl !== "#") ?? events[0],
    [events],
  )

  const handleStickyTap = useCallback(() => {
    if (headliner) handleSelect(headliner)
  }, [headliner, handleSelect])

  return (
    <>
      <div className="grid md:grid-cols-3 gap-10">
        {events.map((event, index) => (
          <EventCardFestival
            key={event.id}
            id={event.id}
            title={event.title}
            highlight={event.highlight}
            ticketUrl={event.ticketUrl}
            logo={event.logo ?? undefined}
            eventDate={event.eventDate ?? undefined}
            colorIndex={index}
            artistImage={ARTIST_IMAGES[event.id]}
            artistImagePosition={ARTIST_IMAGE_POSITIONS[event.id]}
            artistImageFit={ARTIST_IMAGE_FITS[event.id]}
            artistImageBg={ARTIST_IMAGE_BGS[event.id]}
            onSelect={() => handleSelect(event)}
          />
        ))}
      </div>

      <ArtistModal
        open={isModalOpen}
        onClose={handleClose}
        artist={
          selectedArtist
            ? {
                id: selectedArtist.id,
                title: selectedArtist.title,
                description: selectedArtist.description,
                highlight: selectedArtist.highlight,
                ticketUrl: selectedArtist.ticketUrl,
                time: selectedArtist.time ?? undefined,
                logo: selectedArtist.logo ?? undefined,
              }
            : null
        }
        artistImage={selectedArtist ? ARTIST_IMAGES[selectedArtist.id] : undefined}
        artistImagePosition={selectedArtist ? ARTIST_IMAGE_POSITIONS[selectedArtist.id] : undefined}
      />

      {/* Sticky floating CTA — mobile only, visible when #programacion is in viewport */}
      {headliner && (
        <StickyMobileCTA
          label="Entradas"
          onTap={handleStickyTap}
        />
      )}
    </>
  )
}
