/**
 * SPUD memory repository — Drizzle ORM query builder.
 *
 * Persistent KV store with categories and optional TTL.
 * Upsert by (category, memory_key). Expired entries filtered at read time.
 */

import { eq, and, gt, desc, sql, isNull, or } from "drizzle-orm"
import { getDb } from "./drizzle"
import { spudMemory } from "./schema"

export type MemoryEntry = {
  id: string
  category: string
  memoryKey: string
  value: unknown
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Set a memory entry (upsert by category + key).
 */
export async function setMemory(
  category: string,
  key: string,
  value: unknown,
  expiresAt?: Date,
): Promise<void> {
  const db = getDb()

  await db
    .insert(spudMemory)
    .values({
      category,
      memoryKey: key,
      value,
      expiresAt: expiresAt ?? null,
    })
    .onConflictDoUpdate({
      target: [spudMemory.category, spudMemory.memoryKey],
      set: {
        value: sql`EXCLUDED.value`,
        expiresAt: sql`EXCLUDED.expires_at`,
        updatedAt: sql`NOW()`,
      },
    })
}

/**
 * Get a single memory entry. Returns null if not found or expired.
 */
export async function getMemory(
  category: string,
  key: string,
): Promise<MemoryEntry | null> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudMemory)
    .where(
      and(
        eq(spudMemory.category, category),
        eq(spudMemory.memoryKey, key),
        or(isNull(spudMemory.expiresAt), gt(spudMemory.expiresAt, new Date())),
      ),
    )
    .limit(1)

  if (rows.length === 0) return null
  return parseRow(rows[0]!)
}

/**
 * List memory entries with optional category filter. Excludes expired.
 */
export async function listMemory(opts?: {
  category?: string
  limit?: number
}): Promise<MemoryEntry[]> {
  const db = getDb()
  const limit = opts?.limit ?? 50

  let query = db
    .select()
    .from(spudMemory)
    .where(or(isNull(spudMemory.expiresAt), gt(spudMemory.expiresAt, new Date())))
    .orderBy(desc(spudMemory.updatedAt))
    .limit(limit)
    .$dynamic()

  if (opts?.category) {
    query = query.where(
      and(
        eq(spudMemory.category, opts.category),
        or(isNull(spudMemory.expiresAt), gt(spudMemory.expiresAt, new Date())),
      ),
    )
  }

  const rows = await query
  return rows.map(parseRow)
}

/**
 * Delete a specific memory entry.
 */
export async function deleteMemory(category: string, key: string): Promise<boolean> {
  const db = getDb()

  const rows = await db
    .delete(spudMemory)
    .where(
      and(
        eq(spudMemory.category, category),
        eq(spudMemory.memoryKey, key),
      ),
    )
    .returning({ id: spudMemory.id })

  return rows.length > 0
}

/**
 * Delete all expired entries. Returns count deleted.
 */
export async function deleteExpired(): Promise<number> {
  const db = getDb()
  const now = new Date()

  const rows = await db
    .delete(spudMemory)
    .where(
      and(
        sql`${spudMemory.expiresAt} IS NOT NULL`,
        sql`${spudMemory.expiresAt} <= ${now}`,
      ),
    )
    .returning({ id: spudMemory.id })

  return rows.length
}

/* ─── Helpers ─── */

function parseRow(row: typeof spudMemory.$inferSelect): MemoryEntry {
  return {
    id: row.id,
    category: row.category,
    memoryKey: row.memoryKey,
    value: row.value,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
