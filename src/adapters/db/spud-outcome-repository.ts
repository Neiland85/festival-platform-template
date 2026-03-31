/**
 * SPUD outcome repository — Drizzle ORM query builder.
 *
 * Tracks lead conversions (when a scored lead completes an order).
 * Dedup guaranteed by UNIQUE(lead_id, order_id) + ON CONFLICT DO NOTHING.
 */

import { eq, desc, sql } from "drizzle-orm"
import { getDb } from "./drizzle"
import { spudOutcomes } from "./schema"
import type { ConversionSnapshot } from "@/domain/spud/types"

export type OutcomeRow = {
  id: string
  leadId: string
  orderId: string
  scoreAtConversion: number | null
  tierAtConversion: string | null
  createdAt: Date
  convertedAt: Date
}

/**
 * Save a conversion outcome. Idempotent: ON CONFLICT DO NOTHING.
 * Returns true if inserted, false if already existed.
 */
export async function saveOutcome(snapshot: ConversionSnapshot): Promise<boolean> {
  const db = getDb()

  const rows = await db
    .insert(spudOutcomes)
    .values({
      leadId: snapshot.leadId,
      orderId: snapshot.orderId,
      scoreAtConversion: snapshot.scoreAtConversion,
      tierAtConversion: snapshot.tierAtConversion,
    })
    .onConflictDoNothing({
      target: [spudOutcomes.leadId, spudOutcomes.orderId],
    })
    .returning({ id: spudOutcomes.id })

  return rows.length > 0
}

/**
 * Find outcomes with optional limit.
 */
export async function findOutcomes(limit = 50): Promise<OutcomeRow[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudOutcomes)
    .orderBy(desc(spudOutcomes.convertedAt))
    .limit(limit)

  return rows.map(parseRow)
}

/**
 * Find outcomes for a specific lead.
 */
export async function findOutcomesByLeadId(leadId: string): Promise<OutcomeRow[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudOutcomes)
    .where(eq(spudOutcomes.leadId, leadId))
    .orderBy(desc(spudOutcomes.convertedAt))

  return rows.map(parseRow)
}

function parseRow(row: typeof spudOutcomes.$inferSelect): OutcomeRow {
  return {
    id: row.id,
    leadId: row.leadId,
    orderId: row.orderId,
    scoreAtConversion: row.scoreAtConversion,
    tierAtConversion: row.tierAtConversion,
    createdAt: row.createdAt,
    convertedAt: row.convertedAt,
  }
}
