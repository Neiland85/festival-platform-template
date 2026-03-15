/**
 * Central white-label configuration
 *
 * This file is the SINGLE source of truth for branding, URLs, and
 * platform identity. Every component reads from here instead of
 * scattering process.env lookups throughout the codebase.
 *
 * Customization guide:
 *   1. Set NEXT_PUBLIC_SITE_NAME and NEXT_PUBLIC_SITE_URL in .env
 *   2. Replace /public/festival_logo.png with your logo
 *   3. Update social links below
 */

// ── Identity ──────────────────────────────────────────

/** Platform / brand name — used in <title>, OG tags, footer, etc. */
export const SITE_NAME =
  process.env["NEXT_PUBLIC_SITE_NAME"] ?? "Platform Name"

/** Canonical site URL — used in sitemap, OG tags, CORS whitelist */
export const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://www.your-platform.com"

/** Short tagline for hero section and meta description */
export const SITE_TAGLINE =
  process.env["NEXT_PUBLIC_SITE_TAGLINE"] ?? "Templates, Assets & Tools"

// ── Branding Assets ───────────────────────────────────

/** Path to the main logo (relative to /public) */
export const LOGO_PATH = "/festival_logo.png"

/** Logo dimensions for next/image */
export const LOGO_WIDTH = 120
export const LOGO_HEIGHT = 60

/** Path to the hero video (relative to /public) */
export const HERO_VIDEO_PATH = "/hero/Tomorrowland-Belgium_2016_Official-Aftermovie_corto.mov"

/** Favicon path */
export const FAVICON_PATH = "/favicon.ico"

// ── Social Links ──────────────────────────────────────

export const SOCIAL_LINKS = {
  instagram: process.env["NEXT_PUBLIC_SOCIAL_INSTAGRAM"] ?? "",
  facebook: process.env["NEXT_PUBLIC_SOCIAL_FACEBOOK"] ?? "",
  twitter: process.env["NEXT_PUBLIC_SOCIAL_TWITTER"] ?? "",
  tiktok: process.env["NEXT_PUBLIC_SOCIAL_TIKTOK"] ?? "",
  youtube: process.env["NEXT_PUBLIC_SOCIAL_YOUTUBE"] ?? "",
} as const

// ── Contact ───────────────────────────────────────────

export const CONTACT_EMAIL =
  process.env["NEXT_PUBLIC_CONTACT_EMAIL"] ?? "info@your-platform.com"

// ── Location ──────────────────────────────────────────

/** Google Maps embed coordinates or place name */
export const VENUE_NAME =
  process.env["NEXT_PUBLIC_VENUE_NAME"] ?? "Platform HQ"

export const VENUE_MAPS_URL =
  process.env["NEXT_PUBLIC_VENUE_MAPS_URL"] ?? ""

// ── Feature Toggles ───────────────────────────────────

/** Is Sentry configured? Enables error tracking. */
export const HAS_SENTRY = Boolean(
  process.env["SENTRY_DSN"] || process.env["NEXT_PUBLIC_SENTRY_DSN"],
)

/** Is Redis configured? Enables distributed rate limiting. */
export const HAS_REDIS = Boolean(
  process.env["REDIS_URL"] || process.env["UPSTASH_REDIS_REST_URL"],
)

/** Is Google Analytics configured? */
export const HAS_GA = Boolean(
  process.env["NEXT_PUBLIC_GA_ID"],
)

/** Is Meta Pixel configured? */
export const HAS_META_PIXEL = Boolean(
  process.env["NEXT_PUBLIC_FB_PIXEL_ID"],
)

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
