import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.sentry.io https://vercel.live https://*.supabase.co wss://*.supabase.co",
      "frame-src https://www.google.com https://maps.google.com https://*.ticketmaster.com https://vercel.live",
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
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
}

// Only wrap with Sentry if DSN is configured
const hasSentry = !!(
  process.env["SENTRY_DSN"] || process.env["NEXT_PUBLIC_SENTRY_DSN"]
)

export default hasSentry
  ? withSentryConfig(nextConfig, {
      // Upload source maps for better stack traces
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      // Suppress noisy logs during build
      silent: !process.env["CI"],
      // Tunnel Sentry events through the app to avoid ad-blockers
      tunnelRoute: "/monitoring",
    })
  : nextConfig
