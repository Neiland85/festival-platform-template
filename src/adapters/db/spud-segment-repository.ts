/**
 * SPUD segment repository — Drizzle ORM query builder.
 *
 * Segments are snapshot-based filter definitions.
 * lead_count is cached and refreshed explicitly.
 * queryLeadsByFilters joins leads + spud_lead_scores.
 */

import { eq, desc, sql } from "drizzle-orm"
import { getDb } from "./drizzle"
import { spudSegments } from "./schema"
import { getPool } from "./pool"
import type { SegmentFilters, LeadData } from "@/domain/spud/types"

/* ─── Types ─── */

export type SegmentRow = {
  id: string
  name: string
  description: string | null
  filters: SegmentFilters
  leadCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/* ─── CRUD ─── */

export async function createSegment(
  name: string,
  filters: SegmentFilters,
  createdBy: string,
  description?: string,
): Promise<string> {
  const db = getDb()

  // Snapshot count at creation
  const count = await countLeadsByFilters(filters)

  const rows = await db
    .insert(spudSegments)
    .values({
      name,
      description: description ?? null,
      filters,
      leadCount: count,
      createdBy,
    })
    .returning({ id: spudSegments.id })

  return rows[0]!.id
}

export async function findSegments(limit = 20): Promise<SegmentRow[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudSegments)
    .orderBy(desc(spudSegments.createdAt))
    .limit(limit)

  return rows.map(parseRow)
}

export async function findSegmentById(id: string): Promise<SegmentRow | null> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudSegments)
    .where(eq(spudSegments.id, id))
    .limit(1)

  if (rows.length === 0) return null
  return parseRow(rows[0]!)
}

export async function updateSegmentCount(id: string, count: number): Promise<void> {
  const db = getDb()

  await db
    .update(spudSegments)
    .set({ leadCount: count, updatedAt: sql`NOW()` })
    .where(eq(spudSegments.id, id))
}

export async function deleteSegment(id: string): Promise<boolean> {
  const db = getDb()

  const rows = await db
    .delete(spudSegments)
    .where(eq(spudSegments.id, id))
    .returning({ id: spudSegments.id })

  return rows.length > 0
}

/* ─── Filter queries (raw SQL for flexibility) ─── */

/**
 * Count leads matching segment filters.
 * Joins leads + spud_lead_scores for score/tier filtering.
 */
export async function countLeadsByFilters(filters: SegmentFilters): Promise<number> {
  const pool = getPool()
  const { where, values } = buildFilterWhere(filters)

  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM leads l
     LEFT JOIN spud_lead_scores s ON s.lead_id = l.id
     WHERE l.deleted_at IS NULL ${where}`,
    values,
  )

  return (result.rows[0]?.cnt as number) ?? 0
}

/**
 * Query leads matching segment filters with pagination.
 */
export async function queryLeadsByFilters(
  filters: SegmentFilters,
  offset: number,
  limit: number,
): Promise<LeadData[]> {
  const pool = getPool()
  const { where, values } = buildFilterWhere(filters)
  const paramIdx = values.length

  const result = await pool.query(
    `SELECT l.id, l.email, l.name, l.surname, l.phone, l.profession,
            l.source, l.created_at, l.event_id
     FROM leads l
     LEFT JOIN spud_lead_scores s ON s.lead_id = l.id
     WHERE l.deleted_at IS NULL ${where}
     ORDER BY l.created_at DESC
     OFFSET $${paramIdx + 1} LIMIT $${paramIdx + 2}`,
    [...values, offset, limit],
  )

  return result.rows.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    name: row.name as string | null,
    surname: row.surname as string | null,
    phone: row.phone as string | null,
    profession: row.profession as string | null,
    source: row.source as string,
    createdAt: new Date(row.created_at as string),
    eventId: row.event_id as string,
  }))
}

/* ─── Helpers ─── */

function buildFilterWhere(filters: SegmentFilters): {
  where: string
  values: unknown[]
} {
  const clauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (filters.tier) {
    clauses.push(`s.tier = $${idx}`)
    values.push(filters.tier)
    idx++
  }

  if (filters.source) {
    clauses.push(`l.source = $${idx}`)
    values.push(filters.source)
    idx++
  }

  if (filters.minScore !== undefined) {
    clauses.push(`s.score >= $${idx}`)
    values.push(filters.minScore)
    idx++
  }

  if (filters.maxScore !== undefined) {
    clauses.push(`s.score <= $${idx}`)
    values.push(filters.maxScore)
    idx++
  }

  if (filters.profession) {
    clauses.push(`l.profession = $${idx}`)
    values.push(filters.profession)
    idx++
  }

  const where = clauses.length > 0 ? "AND " + clauses.join(" AND ") : ""
  return { where, values }
}

function parseRow(row: typeof spudSegments.$inferSelect): SegmentRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    filters: row.filters as SegmentFilters,
    leadCount: row.leadCount,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
