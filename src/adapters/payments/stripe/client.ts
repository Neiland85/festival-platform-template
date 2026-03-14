/**
 * Stripe client with graceful degradation.
 *
 * If STRIPE_SECRET_KEY is not configured, `stripe` will be null
 * and all payment features silently degrade to Ticketmaster/fallback.
 */
import Stripe from "stripe"

const secretKey = process.env["STRIPE_SECRET_KEY"]

export const isStripeConfigured = Boolean(secretKey)

export const stripe: Stripe | null = secretKey
  ? new Stripe(secretKey, { apiVersion: "2026-02-25.clover" })
  : null
