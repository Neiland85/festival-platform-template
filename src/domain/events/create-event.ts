import type { Event } from "./types"

export function createEvent(input: {
  title: string
  description: string
  highlight: string
  ticketUrl: string
}): Event {
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    highlight: input.highlight.trim(),
    ticketUrl: input.ticketUrl.trim(),
    active: true,
    createdAt: new Date(),
  }
}
