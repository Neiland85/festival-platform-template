/**
 * SPUD segments — pure validation and description logic.
 *
 * No I/O. Segments are snapshot-based filter definitions.
 * The repository handles actual DB queries.
 */

import type { SegmentFilters, Tier } from "./types"

const VALID_TIERS: Tier[] = ["hot", "warm", "cold"]

/**
 * Validate segment filters. Returns cleaned filters.
 * Throws on invalid values.
 */
export function validateSegmentFilters(filters: SegmentFilters): SegmentFilters {
  const clean: SegmentFilters = {}

  if (filters.tier !== undefined) {
    if (!VALID_TIERS.includes(filters.tier)) {
      throw new Error(`Invalid tier: ${filters.tier}`)
    }
    clean.tier = filters.tier
  }

  if (filters.source !== undefined && filters.source.trim().length > 0) {
    clean.source = filters.source.trim()
  }

  if (filters.minScore !== undefined) {
    if (filters.minScore < 0 || filters.minScore > 100) {
      throw new Error("minScore must be 0-100")
    }
    clean.minScore = filters.minScore
  }

  if (filters.maxScore !== undefined) {
    if (filters.maxScore < 0 || filters.maxScore > 100) {
      throw new Error("maxScore must be 0-100")
    }
    clean.maxScore = filters.maxScore
  }

  if (
    clean.minScore !== undefined &&
    clean.maxScore !== undefined &&
    clean.minScore > clean.maxScore
  ) {
    throw new Error("minScore cannot exceed maxScore")
  }

  if (filters.profession !== undefined && filters.profession.trim().length > 0) {
    clean.profession = filters.profession.trim()
  }

  return clean
}

/**
 * Generate a human-readable description of segment filters.
 */
export function describeSegment(filters: SegmentFilters): string {
  const parts: string[] = []

  if (filters.tier) parts.push(`tier=${filters.tier}`)
  if (filters.source) parts.push(`source=${filters.source}`)
  if (filters.minScore !== undefined) parts.push(`score>=${filters.minScore}`)
  if (filters.maxScore !== undefined) parts.push(`score<=${filters.maxScore}`)
  if (filters.profession) parts.push(`profession=${filters.profession}`)

  return parts.length > 0 ? parts.join(", ") : "all leads"
}

/**
 * Check if filters are empty (would match all leads).
 */
export function isEmptyFilter(filters: SegmentFilters): boolean {
  return (
    filters.tier === undefined &&
    filters.source === undefined &&
    filters.minScore === undefined &&
    filters.maxScore === undefined &&
    filters.profession === undefined
  )
}
