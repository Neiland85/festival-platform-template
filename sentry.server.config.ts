import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env["SENTRY_DSN"]

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env["NODE_ENV"],

    // Performance monitoring — lower rate in prod to control costs
    tracesSampleRate: process.env["NODE_ENV"] === "production" ? 0.2 : 1.0,

    // Spotlight for local dev debugging
    spotlight: process.env["NODE_ENV"] === "development",
  })
}
