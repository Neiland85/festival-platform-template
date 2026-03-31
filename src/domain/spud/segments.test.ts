/**
 * Segments domain tests — pure functions, no mocks.
 */

import { describe, it, expect } from "vitest"
import {
  validateSegmentFilters,
  describeSegment,
  isEmptyFilter,
} from "./segments"
import type { SegmentFilters } from "./types"

describe("validateSegmentFilters", () => {
  it("returns empty object for empty filters", () => {
    expect(validateSegmentFilters({})).toEqual({})
  })

  it("accepts valid tier", () => {
    expect(validateSegmentFilters({ tier: "hot" })).toEqual({ tier: "hot" })
  })

  it("throws for invalid tier", () => {
    expect(() => validateSegmentFilters({ tier: "nuclear" as never })).toThrow("Invalid tier")
  })

  it("accepts valid score range", () => {
    const result = validateSegmentFilters({ minScore: 40, maxScore: 70 })
    expect(result).toEqual({ minScore: 40, maxScore: 70 })
  })

  it("throws when minScore > maxScore", () => {
    expect(() => validateSegmentFilters({ minScore: 80, maxScore: 40 })).toThrow(
      "minScore cannot exceed maxScore",
    )
  })

  it("throws for out-of-range scores", () => {
    expect(() => validateSegmentFilters({ minScore: -1 })).toThrow("minScore must be 0-100")
    expect(() => validateSegmentFilters({ maxScore: 101 })).toThrow("maxScore must be 0-100")
  })

  it("trims source and profession", () => {
    const result = validateSegmentFilters({ source: "  organic  ", profession: "  Dev  " })
    expect(result).toEqual({ source: "organic", profession: "Dev" })
  })

  it("ignores empty string source/profession", () => {
    const result = validateSegmentFilters({ source: "  ", profession: "" })
    expect(result).toEqual({})
  })

  it("accepts all filters combined", () => {
    const filters: SegmentFilters = {
      tier: "warm",
      source: "referral",
      minScore: 30,
      maxScore: 69,
      profession: "Marketing",
    }
    expect(validateSegmentFilters(filters)).toEqual(filters)
  })
})

describe("describeSegment", () => {
  it("returns 'all leads' for empty filters", () => {
    expect(describeSegment({})).toBe("all leads")
  })

  it("describes single filter", () => {
    expect(describeSegment({ tier: "hot" })).toBe("tier=hot")
  })

  it("describes multiple filters", () => {
    expect(describeSegment({ tier: "warm", source: "organic", minScore: 40 })).toBe(
      "tier=warm, source=organic, score>=40",
    )
  })

  it("describes score range", () => {
    expect(describeSegment({ minScore: 30, maxScore: 70 })).toBe("score>=30, score<=70")
  })
})

describe("isEmptyFilter", () => {
  it("returns true for empty object", () => {
    expect(isEmptyFilter({})).toBe(true)
  })

  it("returns false when any filter is set", () => {
    expect(isEmptyFilter({ tier: "hot" })).toBe(false)
    expect(isEmptyFilter({ minScore: 0 })).toBe(false)
  })
})
