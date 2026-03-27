import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const securityHeaders = [
  // ── Standard Security Headers ──────────────────────────
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Download-Options", value: "noopen" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },

  // ── Privacy Headers (VPN-grade) ────────────────────────
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      // Disable invasive browser APIs — prevents fingerprinting
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "browsing-topics=()", // Disable Google FLoC/Topics API
      "interest-cohort=()", // Disable FLoC (legacy)
      "serial=()",
      "usb=()",
      "bluetooth=()",
      "midi=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "ambient-light-sensor=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=(self)",
      "autoplay=(self)",
      "fullscreen=(self)",
      "payment=(self)", // Only allow Stripe in same origin
    ].join(", "),
  },

  // ── HSTS (HTTP Strict Transport Security) ──────────────
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // ── Cross-Origin Isolation (prevents Spectre/Meltdown) ─
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

  // ── Content Security Policy ────────────────────────────
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.sentry.io https://cdn.sanity.io https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://cdn.sanity.io",
      "connect-src 'self' https://*.sentry.io https://vercel.live https://*.supabase.co wss://*.supabase.co https://*.sanity.io https://*.apicdn.sanity.io https://api.stripe.com",
      "frame-src https://www.google.com https://maps.google.com https://*.ticketmaster.com https://vercel.live https://*.sanity.io https://js.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ].join("; "),
  },
]

// ── CDN image domains (CloudFront / S3) ──────────────────
// Parses NEXT_PUBLIC_CDN_HERO_URL to allow next/image optimization.
const cdnHeroUrl = process.env["NEXT_PUBLIC_CDN_HERO_URL"]
const cdnRemotePatterns: NextConfig["images"] = cdnHeroUrl
  ? {
      remotePatterns: [
        {
          protocol: "https",
          hostname: new URL(cdnHeroUrl).hostname,
          pathname: "/hero/**",
        },
      ],
    }
  : undefined

const nextConfig: NextConfig = {
  ...(cdnRemotePatterns ? { images: cdnRemotePatterns } : {}),
  experimental: {
    optimizePackageImports: ["react"],
  },
  headers: async () => [
    {
      // Apply security headers to all routes except /studio
      source: "/((?!studio).*)",
      headers: securityHeaders,
    },
    {
      // Studio needs relaxed CSP for Sanity's UI to work
      source: "/studio/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
    {
      // Explicit CORS policy for API routes — restrict to same origin
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: process.env["NEXT_PUBLIC_SITE_URL"] || "https://www.your-platform.com" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, x-csrf-token, idempotency-key" },
        { key: "Access-Control-Max-Age", value: "86400" },
      ],
    },
  ],
}

// Only wrap with Sentry if DSN is configured
const hasSentry = !!(
  process.env["SENTRY_DSN"] || process.env["NEXT_PUBLIC_SENTRY_DSN"]
)

const configWithIntl = withNextIntl(nextConfig)

export default hasSentry
  ? withSentryConfig(configWithIntl, {
      // Upload source maps for better stack traces
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      // Suppress noisy logs during build
      silent: !process.env["CI"],
      // Tunnel Sentry events through the app to avoid ad-blockers
      tunnelRoute: "/monitoring",
    })
  : configWithIntl
