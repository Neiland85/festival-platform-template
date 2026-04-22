/**
 * SPUD memory — pure validation and expiration logic.
 *
 * No I/O. All persistence is in the repository layer.
 */

import type { MemoryCategory } from "./types"

const VALID_CATEGORIES: MemoryCategory[] = ["scoring", "segments", "planning", "general"]

/**
 * Check if a memory entry has expired.
 */
export function isExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (expiresAt === null) return false
  return now.getTime() >= expiresAt.getTime()
}

/**
 * Validate and return a MemoryCategory. Throws if invalid.
 */
export function validateCategory(category: string): MemoryCategory {
  if (VALID_CATEGORIES.includes(category as MemoryCategory)) {
    return category as MemoryCategory
  }
  throw new Error(`Invalid memory category: ${category}. Valid: ${VALID_CATEGORIES.join(", ")}`)
}

/**
 * Compute an expiration timestamp from a TTL in seconds.
 */
export function computeExpiresAt(ttlSeconds: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlSeconds * 1000)
}
