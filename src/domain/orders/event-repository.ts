/**
 * Event repository — read-only queries for the checkout flow.
 *
 * Only exposes what the order domain needs:
 * pricing, capacity, and ticket counter operations.
 */

import { getPool } from "@/adapters/db/pool"
import type { EventWithPricing } from "./types"

/**
 * Find an active event with pricing/capacity data.
 * Returns null if event doesn't exist or is inactive.
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
 * Atomically increment tickets_sold for an event.
 *
 * Uses UPDATE ... SET tickets_sold = tickets_sold + $1
 * which is safe under concurrent writes (row-level lock).
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
