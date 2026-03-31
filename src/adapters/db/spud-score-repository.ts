/**
 * SPUD score repository — Drizzle ORM query builder.
 *
 * Persists and queries lead scores produced by the SPUD scorer.
 * Upsert by leadId: the latest score always wins.
 * Uses JSONB for factors — no manual JSON.parse needed.
 */

import { eq, desc, sql } from "drizzle-orm"
import { getDb } from "./drizzle"
import { spudLeadScores } from "./schema"

export type SaveScoreInput = {
  leadId: string
  score: number
  tier: string
  factors: Record<string, number>
  runId?: string
}

export type ScoreRow = {
  id: string
  leadId: string
  score: number
  tier: string
  factors: Record<string, number>
  runId: string | null
  scoredAt: Date
}

/**
 * Save or update a lead score (upsert by lead_id).
 * Latest score wins — previous scores for the same lead are overwritten.
 */
export async function saveScore(input: SaveScoreInput): Promise<void> {
  const db = getDb()

  await db
    .insert(spudLeadScores)
    .values({
      leadId: input.leadId,
      score: input.score,
      tier: input.tier,
      factors: input.factors,
      runId: input.runId ?? null,
    })
    .onConflictDoUpdate({
      target: [spudLeadScores.leadId],
      set: {
        score: sql`EXCLUDED.score`,
        tier: sql`EXCLUDED.tier`,
        factors: sql`EXCLUDED.factors`,
        runId: sql`EXCLUDED.run_id`,
        scoredAt: sql`NOW()`,
      },
    })
}

/**
 * Find scores with optional tier filter.
 */
export async function findScores(opts?: {
  tier?: string
  limit?: number
}): Promise<ScoreRow[]> {
  const db = getDb()
  const limit = opts?.limit ?? 50

  let query = db
    .select({
      id: spudLeadScores.id,
      leadId: spudLeadScores.leadId,
      score: spudLeadScores.score,
      tier: spudLeadScores.tier,
      factors: spudLeadScores.factors,
      runId: spudLeadScores.runId,
      scoredAt: spudLeadScores.scoredAt,
    })
    .from(spudLeadScores)
    .orderBy(desc(spudLeadScores.score))
    .limit(limit)
    .$dynamic()

  if (opts?.tier) {
    query = query.where(eq(spudLeadScores.tier, opts.tier))
  }

  return (await query) as ScoreRow[]
}

/**
 * Find the latest score for a specific lead.
 */
export async function findScoreByLeadId(leadId: string): Promise<ScoreRow | null> {
  const db = getDb()

  const rows = await db
    .select({
      id: spudLeadScores.id,
      leadId: spudLeadScores.leadId,
      score: spudLeadScores.score,
      tier: spudLeadScores.tier,
      factors: spudLeadScores.factors,
      runId: spudLeadScores.runId,
      scoredAt: spudLeadScores.scoredAt,
    })
    .from(spudLeadScores)
    .where(eq(spudLeadScores.leadId, leadId))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as ScoreRow
}
