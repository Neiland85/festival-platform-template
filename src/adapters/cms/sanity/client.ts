/**
 * Sanity client with graceful degradation.
 *
 * If NEXT_PUBLIC_SANITY_PROJECT_ID is not set, all queries return null.
 * This ensures the template works without Sanity configured.
 */
import { createClient, type SanityClient } from "next-sanity"

const projectId = process.env["NEXT_PUBLIC_SANITY_PROJECT_ID"]
const dataset = process.env["NEXT_PUBLIC_SANITY_DATASET"] ?? "production"
const apiVersion = process.env["NEXT_PUBLIC_SANITY_API_VERSION"] ?? "2024-01-01"

/** Whether Sanity is configured and available */
export const isSanityConfigured = Boolean(projectId)

/** Sanity client instance — only usable when isSanityConfigured is true */
export const sanityClient: SanityClient | null = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: process.env.NODE_ENV === "production",
    })
  : null

/**
 * Authenticated client for server-side mutations (webhooks, revalidation).
 * Uses SANITY_API_TOKEN for write access.
 */
export const sanityWriteClient: SanityClient | null =
  projectId && process.env["SANITY_API_TOKEN"]
    ? createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env["SANITY_API_TOKEN"],
      })
    : null
