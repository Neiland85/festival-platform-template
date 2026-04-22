/**
 * Event repository — atomic capacity operations for the checkout flow.
 *
 * All capacity mutations use single UPDATE statements with WHERE guards,
 * eliminating TOCTOU race conditions under concurrent purchases.
 *
 * PostgreSQL row-level locks serialize concurrent UPDATEs on the same row,
 * making these operations safe without explicit transactions or FOR UPDATE.
 */

import { getPool } from "@/adapters/db/pool"
import type { EventWithPricing } from "./types"

/**
 * Find an active event with pricing/capacity data (read-only).
 * Used for display/validation before checkout — NOT for capacity decisions.
 */
export async function findEventWithPricing(
  eventId: string,
): Promise<EventWithPricing | null> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT id, title, price_cents, capacity, tickets_sold, active
     FROM events
     WHERE id = $1 AND active = true
     LIMIT 1`,
    [eventId],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row["id"] as string,
    title: row["title"] as string,
    priceCents: row["price_cents"] as number | null,
    capacity: row["capacity"] as number | null,
    ticketsSold: row["tickets_sold"] as number,
    active: row["active"] as boolean,
  }
}

/**
 * Atomically reserve capacity for an event.
 *
 * Single UPDATE with WHERE guard — impossible to oversell:
 * - If capacity IS NULL → unlimited, always succeeds
 * - If tickets_sold + quantity <= capacity → succeeds, returns updated row
 * - If insufficient capacity → returns null (0 rows affected)
 *
 * PostgreSQL row-level lock prevents concurrent UPDATEs from seeing
 * stale tickets_sold values (serialized at the row level).
 */
export async function reserveCapacity(
  eventId: string,
  quantity: number,
): Promise<EventWithPricing | null> {
  const pool = getPool()
  const result = await pool.query(
    `UPDATE events
     SET tickets_sold = tickets_sold + $1
     WHERE id = $2
       AND active = true
       AND (capacity IS NULL OR tickets_sold + $1 <= capacity)
     RETURNING id, title, price_cents, capacity, tickets_sold, active`,
    [quantity, eventId],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row["id"] as string,
    title: row["title"] as string,
    priceCents: row["price_cents"] as number | null,
    capacity: row["capacity"] as number | null,
    ticketsSold: row["tickets_sold"] as number,
    active: row["active"] as boolean,
  }
}

/**
 * Release previously reserved capacity (expired/cancelled/refunded orders).
 *
 * Atomic decrement with floor at 0 to prevent negative tickets_sold.
 */
export async function releaseCapacity(
  eventId: string,
  quantity: number,
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE events
     SET tickets_sold = GREATEST(0, tickets_sold - $1)
     WHERE id = $2`,
    [quantity, eventId],
  )
}

/**
 * @deprecated Use reserveCapacity() instead. Kept for backward compat.
 */
export async function incrementTicketsSold(
  eventId: string,
  quantity: number,
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE events SET tickets_sold = tickets_sold + $1 WHERE id = $2`,
    [quantity, eventId],
  )
}
