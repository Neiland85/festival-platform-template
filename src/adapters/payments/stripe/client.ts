/**
 * Stripe client singleton — lazy initialization.
 *
 * Returns null when STRIPE_SECRET_KEY is not configured,
 * enabling graceful degradation (ADR-003 / ADR-004).
 *
 * Uses validated env from src/lib/env.ts — no raw process.env.
 */

import Stripe from "stripe"
import { serverEnv } from "@/lib/env"

let instance: Stripe | null = null

export function getStripeClient(): Stripe | null {
  if (instance) return instance

  const key = serverEnv.STRIPE_SECRET_KEY
  if (!key) return null

  instance = new Stripe(key, {
    apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
  })

  return instance
}

/** Throws if Stripe is not configured — use in endpoints that require it */
export function requireStripe(): Stripe {
  const client = getStripeClient()
  if (!client) {
    throw new StripeNotConfiguredError()
  }
  return client
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured. Set STRIPE_SECRET_KEY in environment.")
    this.name = "StripeNotConfiguredError"
  }
}
