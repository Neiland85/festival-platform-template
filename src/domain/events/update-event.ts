import type { Event } from "./types"

export type EventUpdate = {
  title?: string
  description?: string
  highlight?: string
  ticketUrl?: string
  active?: boolean
}

export function applyEventUpdate(existing: Event, patch: EventUpdate): Event {
  return {
    ...existing,
    title: patch.title !== undefined ? patch.title.trim() : existing.title,
    description: patch.description !== undefined ? patch.description.trim() : existing.description,
    highlight: patch.highlight !== undefined ? patch.highlight.trim() : existing.highlight,
    ticketUrl: patch.ticketUrl !== undefined ? patch.ticketUrl.trim() : existing.ticketUrl,
    active: patch.active !== undefined ? patch.active : existing.active,
  }
}
