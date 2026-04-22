/**
 * SPUD lead scorer — deterministic, pure functions.
 *
 * Computes a 0–100 score for a lead based on five weighted factors.
 * No I/O, no side effects, no external calls. Fully testable without mocks.
 *
 * Factor weights (total = 100):
 *   profile_completeness  20   — +5 per filled field (name, surname, phone, profession)
 *   source_quality        15   — referral=15, organic=10, paid=8, social=5, other=3
 *   recency               20   — exponential decay: 20 * e^(-days/30)
 *   event_engagement      20   — min(eventCount * 10, 20)
 *   purchase_history      25   — min(completedOrders * 12, 25)
 */

import type { LeadData, ScoringContext, LeadScore, Tier } from "./types"

/* ─── Source weights ─── */

const SOURCE_SCORES: Record<string, number> = {
  referral: 15,
  organic: 10,
  paid: 8,
  social: 5,
}
const SOURCE_DEFAULT = 3

/* ─── Tier boundaries ─── */

export function deriveTier(score: number): Tier {
  if (score >= 70) return "hot"
  if (score >= 40) return "warm"
  return "cold"
}

/* ─── Individual factor functions ─── */

export function scoreProfileCompleteness(lead: LeadData): number {
  let points = 0
  if (lead.name) points += 5
  if (lead.surname) points += 5
  if (lead.phone) points += 5
  if (lead.profession) points += 5
  return points
}

export function scoreSourceQuality(source: string): number {
  return SOURCE_SCORES[source.toLowerCase()] ?? SOURCE_DEFAULT
}

export function scoreRecency(createdAt: Date, now: Date): number {
  const diffMs = now.getTime() - createdAt.getTime()
  const days = Math.max(0, diffMs / (1000 * 60 * 60 * 24))
  return Math.round(20 * Math.exp(-days / 30) * 100) / 100
}

export function scoreEventEngagement(eventCount: number): number {
  return Math.min(eventCount * 10, 20)
}

export function scorePurchaseHistory(completedOrders: number): number {
  return Math.min(completedOrders * 12, 25)
}

/* ─── Main scorer ─── */

/**
 * Score a single lead. Pure function — all data must be passed in.
 *
 * @param lead      — lead profile data
 * @param context   — cross-entity context (event count, orders)
 * @param now       — reference timestamp (default: Date.now). Pass explicitly for deterministic tests.
 */
export function scoreLead(
  lead: LeadData,
  context: ScoringContext,
  now: Date = new Date(),
): LeadScore {
  const factors: Record<string, number> = {
    profile_completeness: scoreProfileCompleteness(lead),
    source_quality: scoreSourceQuality(lead.source),
    recency: scoreRecency(lead.createdAt, now),
    event_engagement: scoreEventEngagement(context.eventCount),
    purchase_history: scorePurchaseHistory(context.completedOrders),
  }

  const raw = Object.values(factors).reduce((sum, v) => sum + v, 0)
  const score = Math.round(Math.min(100, Math.max(0, raw)))

  return {
    leadId: lead.id,
    score,
    tier: deriveTier(score),
    factors,
  }
}
