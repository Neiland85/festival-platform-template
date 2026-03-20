/**
 * Central white-label configuration
 *
 * This file is the SINGLE source of truth for branding, URLs, and
 * platform identity. Every component reads from here instead of
 * scattering process.env lookups throughout the codebase.
 *
 * All env vars are validated at boot by src/lib/env.ts (Zod).
 * No raw process.env access here — only typed, validated values.
 *
 * Customization guide:
 *   1. Set NEXT_PUBLIC_SITE_NAME and NEXT_PUBLIC_SITE_URL in .env
 *   2. Replace /public/clarity-logo-light.png with your logo
 *   3. Update social links below
 */

import { clientEnv, features } from "@/lib/env"

// ── Identity ──────────────────────────────────────────

/** Platform / brand name — used in <title>, OG tags, footer, etc. */
export const SITE_NAME = clientEnv.NEXT_PUBLIC_SITE_NAME

/** Canonical site URL — used in sitemap, OG tags, CORS whitelist */
export const SITE_URL = clientEnv.NEXT_PUBLIC_SITE_URL

/** Short tagline for hero section and meta description */
export const SITE_TAGLINE = clientEnv.NEXT_PUBLIC_SITE_TAGLINE

// ── Branding Assets ───────────────────────────────────

/** Path to the main logo (relative to /public) */
export const LOGO_PATH = "/clarity-logo-light.png"

/** Logo dimensions for next/image */
export const LOGO_WIDTH = 120
export const LOGO_HEIGHT = 60

/** Path to the hero video (relative to /public) */
export const HERO_VIDEO_PATH = "/hero/Tomorrowland-Belgium_2016_Official-Aftermovie_corto.mov"

/** Favicon path */
export const FAVICON_PATH = "/favicon.ico"

// ── Social Links ──────────────────────────────────────

export const SOCIAL_LINKS = {
  instagram: clientEnv.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
  facebook: clientEnv.NEXT_PUBLIC_SOCIAL_FACEBOOK,
  twitter: clientEnv.NEXT_PUBLIC_SOCIAL_TWITTER,
  tiktok: clientEnv.NEXT_PUBLIC_SOCIAL_TIKTOK,
  youtube: clientEnv.NEXT_PUBLIC_SOCIAL_YOUTUBE,
} as const

// ── Contact ───────────────────────────────────────────

export const CONTACT_EMAIL = clientEnv.NEXT_PUBLIC_CONTACT_EMAIL

// ── Location ──────────────────────────────────────────

/** Google Maps embed coordinates or place name */
export const VENUE_NAME = clientEnv.NEXT_PUBLIC_VENUE_NAME

export const VENUE_MAPS_URL = clientEnv.NEXT_PUBLIC_VENUE_MAPS_URL

// ── Feature Toggles ───────────────────────────────────
// Derived from validated env — no Boolean(undefined) bugs.

/** Is Sentry configured? Enables error tracking. */
export const HAS_SENTRY = features.sentry

/** Is Redis configured? Enables distributed rate limiting. */
export const HAS_REDIS = features.redis

/** Is Google Analytics configured? */
export const HAS_GA = features.analytics

/** Is Meta Pixel configured? */
export const HAS_META_PIXEL = features.metaPixel

/** Is Stripe configured? Enables event ticket checkout (ADR-003). */
export const HAS_STRIPE = features.stripe

// ── Theme ─────────────────────────────────────────────

export const THEME = {
  name: "Golden Hour",
  description: "Warm sunset tones — amber, coral, deep navy",
} as const

// ── SEO Defaults ──────────────────────────────────────

export const SEO = {
  titleTemplate: `%s — ${SITE_NAME}`,
  defaultTitle: SITE_NAME,
  description: SITE_TAGLINE,
  locale: "es_ES",
  alternateLocale: "en_US",
} as const
