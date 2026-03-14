"use client"

import { useEffect } from "react"
import { trackViewContent } from "@/lib/tracking"

type Props = {
  eventId: string
  eventTitle: string
}

/**
 * Invisible client component that fires Meta Pixel ViewContent
 * when an event detail page is viewed. Drop into any server page.
 */
export function ViewContentTracker({ eventId, eventTitle }: Props) {
  useEffect(() => {
    trackViewContent(eventId, eventTitle)
  }, [eventId, eventTitle])

  return null
}
