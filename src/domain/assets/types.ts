/**
 * Asset domain types — core entities for the template marketplace.
 */

export type IntegrationId =
  | "stripe"
  | "sanity"
  | "resend"
  | "redis"
  | "sentry"
  | "analytics"
  | "auth"

export type VerificationStatus = "pending" | "running" | "passed" | "failed"

export interface AssetVersion {
  /** Semver string, e.g. "1.2.0" */
  version: string
  /** ISO 8601 release date */
  releasedAt: string
  /** Changelog summary for this version */
  changelog: string
  /** Git tag or commit SHA */
  ref: string
}

export interface Integration {
  id: IntegrationId
  /** Human-readable label */
  label: string
  /** Whether this integration is optional (graceful degradation) */
  optional: boolean
  /** Setup instructions or doc link */
  docsUrl?: string
}

export interface Verification {
  id: string
  status: VerificationStatus
  /** ISO 8601 timestamp of last run */
  lastRunAt: string | null
  /** Number of checks passed / total */
  passed: number
  total: number
  /** Error details if failed */
  errors: string[]
}

export interface Asset {
  id: string
  name: string
  slug: string
  description: string
  /** Short one-liner for cards */
  tagline: string
  /** Repository URL */
  repoUrl: string
  /** Live demo URL */
  demoUrl?: string
  /** Price in cents (EUR) */
  priceEurCents: number
  /** Tech stack tags */
  stack: string[]
  /** Available integrations */
  integrations: Integration[]
  /** Version history (newest first) */
  versions: AssetVersion[]
  /** Latest verification result */
  verification: Verification | null
  /** ISO 8601 creation date */
  createdAt: string
  /** ISO 8601 last update */
  updatedAt: string
}
