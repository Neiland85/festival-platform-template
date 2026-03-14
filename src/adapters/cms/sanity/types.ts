/**
 * TypeScript types for Sanity CMS documents.
 *
 * These mirror the schemas defined in sanity/schemas/ and are used
 * in the adapter layer for type-safe data fetching.
 */

export type LocalizedString = {
  es?: string
  en?: string
}

export type LocalizedText = LocalizedString

export type SanityImage = {
  _type: "image"
  asset: {
    _ref: string
    _type: "reference"
  }
  hotspot?: {
    x: number
    y: number
    height: number
    width: number
  }
}

export type SanityEvent = {
  _id: string
  _type: "event"
  eventId: string
  title: LocalizedString
  highlight: LocalizedString
  description: LocalizedText
  eventDate?: string
  time?: string
  ticketUrl?: string
  logo?: SanityImage
  priceCents?: number
  active: boolean
  sortOrder: number
}

export type SanityArtist = {
  _id: string
  _type: "artist"
  name: string
  slug: { current: string }
  bio: LocalizedText
  photo?: SanityImage
  genre?: string
  social?: {
    instagram?: string
    spotify?: string
    website?: string
  }
  event?: { _ref: string }
}

export type SanitySiteConfig = {
  _id: string
  _type: "siteConfig"
  festivalName: string
  tagline: LocalizedString
  dates?: {
    start?: string
    end?: string
  }
  logo?: SanityImage
  heroVideo?: string
  social?: {
    instagram?: string
    facebook?: string
    youtube?: string
    tiktok?: string
  }
  location?: {
    venueName?: string
    city?: string
    region?: string
    mapsEmbedUrl?: string
  }
}
