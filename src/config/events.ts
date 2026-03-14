/**
 * EXAMPLE DATA - Replace with your festival events
 *
 * Each event needs: id, title, time, description, highlight, ticketUrl
 * Set ticketUrl to "#" if tickets are not yet available.
 */

export const HEADER_TICKER =
"19/06 Chambao · 20/06 Bresh · 21/06 Oh See · 23/06 Ritual · 24/06 Injerto Flamenco · 25/06 Injerto Flamenco · 26/06 GOA · 27/06 Tropicalia · 28/06 Techno Flamenco"

export type EventConfig = {
  id: string
  title: string
  date?: string
  time: string
  description: string
  highlight: string
  ticketUrl: string
  logo?: string
}

// EXAMPLE DATA - Replace with your festival events
export const EVENTS: EventConfig[] = [
  {
    id: "chambao",
    title: "Chambao",
    time: "19/06",
    description: "Flamenco chill concert at the festival.",
    highlight: "Flamenco chill",
    ticketUrl: "#"
  },
  {
    id: "bresh",
    title: "Bresh",
    time: "20/06",
    description: "The most viral party arrives at the festival.",
    highlight: "International party",
    ticketUrl: "#"
  },
  {
    id: "ohsee",
    title: "Oh See",
    time: "21/06",
    description: "Contemporary electronic music by the sea.",
    highlight: "Electronic",
    ticketUrl: "#"
  },
  {
    id: "goa",
    title: "GOA",
    time: "26/06",
    description: "Underground electronic session.",
    highlight: "Underground electronic",
    ticketUrl: "#"
  },
  {
    id: "tropicalia",
    title: "Tropicalia",
    time: "27/06",
    description: "Summer music and tropical vibes.",
    highlight: "Summer music",
    ticketUrl: "#"
  },
  {
    id: "tecnoflamenco",
    title: "Techno Flamenco",
    time: "28/06",
    description: "Flamenco and electronic fusion.",
    highlight: "Electronic flamenco",
    ticketUrl: "#"
  }
]

export function getEvent(id: string) {
  return EVENTS.find(e => e.id === id)
}
