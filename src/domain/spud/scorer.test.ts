/**
 * Scorer tests — pure functions, no mocks needed.
 */

import { describe, it, expect } from "vitest"
import {
  scoreLead,
  deriveTier,
  scoreProfileCompleteness,
  scoreSourceQuality,
  scoreRecency,
  scoreEventEngagement,
  scorePurchaseHistory,
} from "./scorer"
import type { LeadData, ScoringContext } from "./types"

/* ─── Helpers ─── */

const NOW = new Date("2026-03-31T12:00:00Z")

function makeLead(overrides: Partial<LeadData> = {}): LeadData {
  return {
    id: "lead-1",
    email: "test@example.com",
    source: "organic",
    createdAt: NOW,
    eventId: "evt-1",
    ...overrides,
  }
}

function makeContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    eventCount: 0,
    completedOrders: 0,
    ...overrides,
  }
}

/* ─── deriveTier ─── */

describe("deriveTier", () => {
  it("returns hot for score >= 70", () => {
    expect(deriveTier(70)).toBe("hot")
    expect(deriveTier(100)).toBe("hot")
  })

  it("returns warm for score 40-69", () => {
    expect(deriveTier(40)).toBe("warm")
    expect(deriveTier(69)).toBe("warm")
  })

  it("returns cold for score < 40", () => {
    expect(deriveTier(0)).toBe("cold")
    expect(deriveTier(39)).toBe("cold")
  })
})

/* ─── scoreProfileCompleteness ─── */

describe("scoreProfileCompleteness", () => {
  it("returns 0 for empty profile", () => {
    expect(scoreProfileCompleteness(makeLead())).toBe(0)
  })

  it("returns 5 per field", () => {
    expect(scoreProfileCompleteness(makeLead({ name: "Ana" }))).toBe(5)
    expect(scoreProfileCompleteness(makeLead({ name: "Ana", surname: "García" }))).toBe(10)
  })

  it("returns 20 for fully filled profile", () => {
    expect(
      scoreProfileCompleteness(
        makeLead({ name: "Ana", surname: "García", phone: "+34600", profession: "Dev" }),
      ),
    ).toBe(20)
  })

  it("ignores null fields", () => {
    expect(scoreProfileCompleteness(makeLead({ name: null, phone: null }))).toBe(0)
  })
})

/* ─── scoreSourceQuality ─── */

describe("scoreSourceQuality", () => {
  it("scores known sources correctly", () => {
    expect(scoreSourceQuality("referral")).toBe(15)
    expect(scoreSourceQuality("organic")).toBe(10)
    expect(scoreSourceQuality("paid")).toBe(8)
    expect(scoreSourceQuality("social")).toBe(5)
  })

  it("returns default for unknown sources", () => {
    expect(scoreSourceQuality("unknown")).toBe(3)
    expect(scoreSourceQuality("direct")).toBe(3)
  })

  it("is case-insensitive", () => {
    expect(scoreSourceQuality("Referral")).toBe(15)
    expect(scoreSourceQuality("ORGANIC")).toBe(10)
  })
})

/* ─── scoreRecency ─── */

describe("scoreRecency", () => {
  it("returns ~20 for lead created right now", () => {
    expect(scoreRecency(NOW, NOW)).toBe(20)
  })

  it("decays over 30 days", () => {
    const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
    const score = scoreRecency(thirtyDaysAgo, NOW)
    // e^(-1) ≈ 0.368, so 20 * 0.368 ≈ 7.36
    expect(score).toBeGreaterThan(7)
    expect(score).toBeLessThan(8)
  })

  it("approaches 0 for very old leads", () => {
    const yearAgo = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000)
    expect(scoreRecency(yearAgo, NOW)).toBeLessThan(1)
  })

  it("handles future dates gracefully (clamps to 0 days)", () => {
    const future = new Date(NOW.getTime() + 1000000)
    expect(scoreRecency(future, NOW)).toBe(20)
  })
})

/* ─── scoreEventEngagement ─── */

describe("scoreEventEngagement", () => {
  it("returns 0 for no events", () => {
    expect(scoreEventEngagement(0)).toBe(0)
  })

  it("scales by 10 per event", () => {
    expect(scoreEventEngagement(1)).toBe(10)
    expect(scoreEventEngagement(2)).toBe(20)
  })

  it("caps at 20", () => {
    expect(scoreEventEngagement(3)).toBe(20)
    expect(scoreEventEngagement(10)).toBe(20)
  })
})

/* ─── scorePurchaseHistory ─── */

describe("scorePurchaseHistory", () => {
  it("returns 0 for no orders", () => {
    expect(scorePurchaseHistory(0)).toBe(0)
  })

  it("scales by 12 per order", () => {
    expect(scorePurchaseHistory(1)).toBe(12)
    expect(scorePurchaseHistory(2)).toBe(24)
  })

  it("caps at 25", () => {
    expect(scorePurchaseHistory(3)).toBe(25)
    expect(scorePurchaseHistory(10)).toBe(25)
  })
})

/* ─── scoreLead (integration) ─── */

describe("scoreLead", () => {
  it("scores a cold lead with empty profile and no history", () => {
    const result = scoreLead(makeLead(), makeContext(), NOW)

    expect(result.leadId).toBe("lead-1")
    // profile=0 + source(organic)=10 + recency=20 + engagement=0 + purchase=0 = 30
    expect(result.score).toBe(30)
    expect(result.tier).toBe("cold")
    expect(result.factors["profile_completeness"]).toBe(0)
    expect(result.factors["source_quality"]).toBe(10)
    expect(result.factors["recency"]).toBe(20)
    expect(result.factors["event_engagement"]).toBe(0)
    expect(result.factors["purchase_history"]).toBe(0)
  })

  it("scores a warm lead with partial profile and some engagement", () => {
    const result = scoreLead(
      makeLead({ name: "Ana", surname: "García", source: "referral" }),
      makeContext({ eventCount: 1 }),
      NOW,
    )

    // profile=10 + source=15 + recency=20 + engagement=10 + purchase=0 = 55
    expect(result.score).toBe(55)
    expect(result.tier).toBe("warm")
  })

  it("scores a hot lead with full profile and purchase history", () => {
    const result = scoreLead(
      makeLead({
        name: "Ana",
        surname: "García",
        phone: "+34600",
        profession: "Dev",
        source: "referral",
      }),
      makeContext({ eventCount: 2, completedOrders: 2 }),
      NOW,
    )

    // profile=20 + source=15 + recency=20 + engagement=20 + purchase=24 = 99
    expect(result.score).toBe(99)
    expect(result.tier).toBe("hot")
  })

  it("clamps score to 100 maximum", () => {
    const result = scoreLead(
      makeLead({
        name: "Ana",
        surname: "García",
        phone: "+34600",
        profession: "Dev",
        source: "referral",
      }),
      makeContext({ eventCount: 5, completedOrders: 5 }),
      NOW,
    )

    // profile=20 + source=15 + recency=20 + engagement=20 + purchase=25 = 100
    expect(result.score).toBe(100)
    expect(result.tier).toBe("hot")
  })

  it("clamps score to 0 minimum", () => {
    // Very old lead with nothing
    const yearAgo = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000)
    const result = scoreLead(
      makeLead({ source: "unknown", createdAt: yearAgo }),
      makeContext(),
      NOW,
    )

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.tier).toBe("cold")
  })

  it("uses current time as default for now parameter", () => {
    const result = scoreLead(makeLead({ createdAt: new Date() }), makeContext())
    expect(result.factors["recency"]).toBeCloseTo(20, 0)
  })
})
