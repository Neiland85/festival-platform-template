/**
 * Centralized environment variable validation — Zod schemas.
 *
 * DESIGN DECISIONS:
 * 1. Validated ONCE at boot time (module load). If a REQUIRED var is missing
 *    the process crashes immediately with a clear diagnostic — no silent
 *    runtime NullPointerException 30 minutes later in a webhook handler.
 *
 * 2. Two schemas: serverEnv (never shipped to browser) and clientEnv
 *    (NEXT_PUBLIC_* only, safe for client bundles).
 *
 * 3. Optional services use .optional().default(...) — the app boots fine
 *    without Redis, Stripe, Sentry, etc. (graceful degradation, ADR-004).
 *
 * 4. NO direct process.env access outside this file. Import { serverEnv }
 *    or { clientEnv } everywhere else.
 *
 * 5. Feature flags derived from parsed values — no Boolean(undefined) bugs.
 *
 * USAGE:
 *   import { serverEnv } from "@/lib/env"
 *   const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY) // typed, non-null
 *
 *   import { clientEnv } from "@/lib/env"
 *   <meta property="og:title" content={clientEnv.NEXT_PUBLIC_SITE_NAME} />
 */

import { z } from "zod"

// ── Helpers ──────────────────────────────────────────

/** Non-empty string (trims whitespace, rejects empty) */
const nonEmpty = z.string().trim().min(1)

/** Positive integer from string env var */
const portNumber = z.coerce.number().int().min(1).max(65535)

/** Float between 0 and 1 (probability) from string */
const probability = z.coerce.number().min(0).max(1)

/** Boolean from string: "true"/"1" → true, anything else → false */
const booleanStr = z
  .string()
  .default("false")
  .transform((v) => v === "true" || v === "1")

// ═══════════════════════════════════════════════════════
// SERVER ENV — never exposed to the browser
// ═══════════════════════════════════════════════════════

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ── Database (required) ──────────────────────────
  DATABASE_URL: nonEmpty.url().describe(
    "PostgreSQL connection string. Required for any persistence.",
  ),

  // ── Auth (required) ──────────────────────────────
  SESSION_SECRET: nonEmpty.min(32).describe(
    "HMAC-SHA256 signing key for session tokens. Min 32 chars. " +
    "Generate: openssl rand -base64 48",
  ),
  ADMIN_PASSWORD: nonEmpty.describe(
    "Dashboard login password.",
  ),

  // ── Security (required for production) ───────────
  CSRF_SECRET: nonEmpty.default("dev-csrf-change-me-in-production").describe(
    "HMAC key for CSRF token generation.",
  ),
  IP_HASH_SALT: nonEmpty.default("dev-salt-change-me").describe(
    "Salt for GDPR-compliant IP hashing.",
  ),

  // ── Stripe (optional — graceful degradation) ─────
  STRIPE_SECRET_KEY: z.string().optional().describe(
    "Stripe API secret key. Without it, checkout is disabled.",
  ),
  STRIPE_WEBHOOK_SECRET: z.string().optional().describe(
    "Stripe webhook signing secret. Required if STRIPE_SECRET_KEY is set.",
  ),

  // ── Redis (optional — falls back to in-memory) ───
  REDIS_URL: z.string().url().optional().describe(
    "Redis connection URL (legacy). Prefer UPSTASH_REDIS_REST_URL.",
  ),
  UPSTASH_REDIS_REST_URL: z.string().url().optional().describe(
    "Upstash Redis HTTP endpoint (edge-compatible).",
  ),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().describe(
    "Upstash Redis bearer token.",
  ),

  // ── Sanity CMS (optional) ────────────────────────
  SANITY_API_TOKEN: z.string().optional(),
  SANITY_REVALIDATE_SECRET: z.string().optional(),

  // ── Observability (optional) ─────────────────────
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // ── Integrations (optional) ──────────────────────
  TM_API_KEY: z.string().optional(),
  QUEUE_RECONCILE_KEY: z.string().optional(),

  // ── Rate Limiting (optional, sensible defaults) ──
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000).describe(
    "Sliding window duration in ms. Default: 60000 (1 min).",
  ),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(20).describe(
    "Max requests per IP per window. Default: 20.",
  ),
  RATE_LIMIT_API_MAX_REQUESTS: z.coerce.number().int().min(1).default(10).describe(
    "Stricter limit for sensitive API routes (/api/v1/auth/*). Default: 10.",
  ),

  // ── Chaos Engineering (optional, dev/staging) ────
  CHAOS: booleanStr,
  CHAOS_ERROR_RATE: probability.default(0.05),
  CHAOS_LATENCY_RATE: probability.default(0.1),
  CHAOS_MAX_LATENCY_MS: z.coerce.number().int().min(0).default(3000),
  CHAOS_KILL_RATE: probability.default(0.01),
  CHAOS_VERBOSE: booleanStr,

  // ── Chaos Redis Proxy (optional) ─────────────────
  CHAOS_REDIS_PROXY: booleanStr,
  CHAOS_REDIS_TIMEOUT_RATE: probability.default(0.02),
  CHAOS_REDIS_SLOW_RATE: probability.default(0.15),
  CHAOS_REDIS_RESET_RATE: probability.default(0.01),
  CHAOS_REDIS_CORRUPT_RATE: probability.default(0.005),
  CHAOS_REDIS_MAX_LATENCY: z.coerce.number().int().min(0).default(5000),
  CHAOS_REDIS_PROXY_PORT: portNumber.default(6380),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: portNumber.default(6379),
})

// ═══════════════════════════════════════════════════════
// CLIENT ENV — NEXT_PUBLIC_* only, safe for browser
// ═══════════════════════════════════════════════════════

const clientSchema = z.object({
  // ── Branding ─────────────────────────────────────
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://www.your-platform.com"),
  NEXT_PUBLIC_SITE_NAME: nonEmpty.default("Platform Name"),
  NEXT_PUBLIC_SITE_TAGLINE: nonEmpty.default("Templates, Assets & Tools"),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().email().default("info@your-platform.com"),

  // ── Venue ────────────────────────────────────────
  NEXT_PUBLIC_VENUE_NAME: nonEmpty.default("Platform HQ"),
  NEXT_PUBLIC_VENUE_MAPS_URL: z.string().default(""),

  // ── Social ───────────────────────────────────────
  NEXT_PUBLIC_SOCIAL_INSTAGRAM: z.string().default(""),
  NEXT_PUBLIC_SOCIAL_FACEBOOK: z.string().default(""),
  NEXT_PUBLIC_SOCIAL_TWITTER: z.string().default(""),
  NEXT_PUBLIC_SOCIAL_TIKTOK: z.string().default(""),
  NEXT_PUBLIC_SOCIAL_YOUTUBE: z.string().default(""),

  // ── Analytics (optional — loaded after consent) ──
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().default(""),

  // ── Observability ────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // ── Stripe (public key) ──────────────────────────
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // ── Sanity CMS ───────────────────────────────────
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_SANITY_DATASET: nonEmpty.default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: nonEmpty.default("2024-01-01"),
})

// ═══════════════════════════════════════════════════════
// BUILD-TIME DETECTION
// ═══════════════════════════════════════════════════════
//
// During `next build`, Next.js sets NEXT_PHASE = "phase-production-build".
// At build time the server env vars (DATABASE_URL, SESSION_SECRET, etc.)
// are NOT available — they only exist at runtime in Vercel/Docker/local.
//
// We detect this phase and return a "dummy" parse result so the build
// succeeds. The dummy values are NEVER used at runtime — they only satisfy
// the type system during static page generation.
//
const isBuildPhase =
  process.env["NEXT_PHASE"] === "phase-production-build"

// ═══════════════════════════════════════════════════════
// PARSE + VALIDATE AT MODULE LOAD
// ═══════════════════════════════════════════════════════

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  label: string,
): z.infer<T> {
  // During build: skip strict validation — return partial parse with defaults.
  // Missing required vars get placeholder values that are never hit at runtime.
  if (isBuildPhase) {
    const result = schema.safeParse(process.env)
    if (result.success) return result.data

    // Build with missing vars: warn (don't crash) and return defaults
    console.warn(
      `⚠ [${label}] Skipping strict validation during build phase. ` +
      `${result.error.issues.length} var(s) missing — will be required at runtime.`,
    )
    // Parse with all-optional override to get at least the defaults.
    // Use a valid URL placeholder for fields that have .url() validation.
    const lenient = schema.safeParse({
      ...Object.fromEntries(
        result.error.issues.map((i) => [
          i.path.join("."),
          i.message.toLowerCase().includes("url") || i.path.join(".").toLowerCase().includes("url")
            ? "https://build.placeholder.invalid"
            : "BUILD_PLACEHOLDER_000000000000000000000000000000",
        ]),
      ),
      ...process.env,
    })
    if (lenient.success) return lenient.data

    // Last resort: return empty-ish object typed correctly
    return {} as z.infer<T>
  }

  const result = schema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`)
      .join("\n")

    const msg = [
      "",
      `╔══════════════════════════════════════════════════════╗`,
      `║  ❌  ${label} VALIDATION FAILED                     `,
      `╚══════════════════════════════════════════════════════╝`,
      "",
      formatted,
      "",
      "Fix your .env.local (or Vercel env vars) and restart.",
      "See .env.example for documentation.",
      "",
    ].join("\n")

    // In test mode, throw instead of killing process (vitest catches it)
    if (process.env["NODE_ENV"] === "test") {
      throw new Error(msg)
    }

    console.error(msg)
    process.exit(1)
  }

  return result.data
}

/**
 * Server-side environment — typed, validated, non-null for required vars.
 * Importing this on the client will not leak secrets (Next.js tree-shakes
 * server-only imports), but prefer clientEnv for client components.
 */
export const serverEnv = parseEnv(serverSchema, "SERVER ENV")

/**
 * Client-safe environment — NEXT_PUBLIC_* only.
 * Safe to import anywhere (server or client components).
 */
export const clientEnv = parseEnv(clientSchema, "CLIENT ENV")

// ═══════════════════════════════════════════════════════
// DERIVED FEATURE FLAGS
// ═══════════════════════════════════════════════════════

/** Feature flags derived from validated env — no Boolean(undefined) bugs */
export const features = {
  /** Is Stripe configured for checkout? */
  stripe: Boolean(serverEnv.STRIPE_SECRET_KEY),

  /** Is Redis available for distributed state? */
  redis: Boolean(serverEnv.UPSTASH_REDIS_REST_URL || serverEnv.REDIS_URL),

  /** Is Sentry configured for error tracking? */
  sentry: Boolean(serverEnv.SENTRY_DSN || clientEnv.NEXT_PUBLIC_SENTRY_DSN),

  /** Is Google Analytics configured? */
  analytics: Boolean(clientEnv.NEXT_PUBLIC_GA_ID),

  /** Is Meta Pixel configured? */
  metaPixel: Boolean(clientEnv.NEXT_PUBLIC_FB_PIXEL_ID),

  /** Is chaos engineering enabled? (dev/staging only) */
  chaos: serverEnv.CHAOS,

  /** Is the chaos Redis proxy enabled? */
  chaosRedisProxy: serverEnv.CHAOS_REDIS_PROXY,
} as const

// ═══════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>
export type Features = typeof features

// Re-export schemas for testing
export const _schemas = { serverSchema, clientSchema } as const
