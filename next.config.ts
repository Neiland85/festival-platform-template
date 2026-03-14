import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.sentry.io https://cdn.sanity.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://cdn.sanity.io",
      "connect-src 'self' https://*.sentry.io https://vercel.live https://*.supabase.co wss://*.supabase.co https://*.sanity.io https://*.apicdn.sanity.io",
      "frame-src https://www.google.com https://maps.google.com https://*.ticketmaster.com https://vercel.live https://*.sanity.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
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
