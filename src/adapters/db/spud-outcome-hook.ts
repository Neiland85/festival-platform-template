/**
 * SPUD outcome hook — fire-and-forget conversion tracking.
 *
 * Called after an order is completed (complete-order.ts).
 * Looks up the lead by (customerEmail + order.eventId) for stronger
 * identification than email alone, then snapshots the current score.
 *
 * NEVER blocks the order flow. Failures are logged but swallowed.
 */

import { getPool } from "./pool"
import { saveOutcome } from "./spud-outcome-repository"
import { buildConversionSnapshot } from "@/domain/spud/outcomes"
import type { Tier } from "@/domain/spud/types"

/**
 * Record a SPUD outcome when an order completes.
 * Fire-and-forget: catches all errors internally.
 *
 * @param customerEmail — from the completed order
 * @param orderId       — the completed order's UUID
 * @param eventId       — the event this order belongs to (stronger than email alone)
 */
export function recordSpudOutcome(
  customerEmail: string,
  orderId: string,
  eventId: string,
): void {
  recordOutcomeAsync(customerEmail, orderId, eventId).catch((err) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "spud_outcome_hook_failed",
        orderId,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
  })
}

async function recordOutcomeAsync(
  customerEmail: string,
  orderId: string,
  eventId: string,
): Promise<void> {
  const pool = getPool()

  // ── Find lead by email + eventId (stronger match) ──
  const leadResult = await pool.query(
    `SELECT l.id AS lead_id, s.score, s.tier
     FROM leads l
     LEFT JOIN spud_lead_scores s ON s.lead_id = l.id
     WHERE l.email = $1 AND l.event_id = $2 AND l.deleted_at IS NULL
     LIMIT 1`,
    [customerEmail, eventId],
  )

  if (leadResult.rows.length === 0) return // No lead found — nothing to track

  const row = leadResult.rows[0]!
  const leadId = row["lead_id"] as string
  const score = row["score"] as number | null
  const tier = row["tier"] as string | null

  const currentScore =
    score !== null && tier !== null
      ? { score, tier: tier as Tier }
      : null

  const snapshot = buildConversionSnapshot(leadId, orderId, currentScore)
  await saveOutcome(snapshot)
}
