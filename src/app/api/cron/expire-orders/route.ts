/**
 * GET /api/cron/expire-orders — Expire stale reserved orders.
 *
 * Finds orders with status = 'reserved' older than EXPIRATION_MINUTES
 * and transitions each to 'expired' via the domain layer, which
 * atomically releases capacity.
 *
 * Intended to be called by Vercel Cron Jobs (vercel.json) every 5 minutes.
 * Vercel sends Authorization: Bearer <CRON_SECRET> automatically.
 *
 * Safety:
 * - Uses expireOrderById() which goes through cancelOrderInternal()
 * - WHERE status = 'reserved' guard prevents double-release
 * - Each order is processed independently — one failure doesn't block others
 * - Idempotent: running twice produces the same result
 *
 * Uses the partial index idx_orders_reserved_created (migration 007)
 * for efficient scanning: WHERE status = 'reserved' + ORDER BY created_at.
 */

import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/adapters/db/pool"
import { expireOrderById } from "@/domain/orders/cancel-order"
import { serverEnv } from "@/lib/env"
import { log } from "@/lib/logger"

/**
 * Orders older than this are considered expired.
 * Stripe Checkout sessions expire after 24 hours by default,
 * but 30 minutes is a sensible UX threshold — if the customer
 * hasn't paid in 30 minutes, free the capacity for others.
 */
const EXPIRATION_MINUTES = 30

/**
 * Maximum orders to process per invocation.
 * Prevents unbounded execution time on Vercel (10s limit for hobby, 60s for pro).
 */
const BATCH_LIMIT = 100

export async function GET(req: NextRequest) {
  // ── Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET> ──
  // Also allow manual invocation with the same header for debugging.
  const cronSecret = serverEnv.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const pool = getPool()

  // ── Find stale reserved orders ──
  // Uses the partial index idx_orders_reserved_created (WHERE status = 'reserved')
  const result = await pool.query(
    `SELECT id
     FROM orders
     WHERE status = 'reserved'
       AND created_at < NOW() - INTERVAL '${EXPIRATION_MINUTES} minutes'
     ORDER BY created_at ASC
     LIMIT $1`,
    [BATCH_LIMIT],
  )

  const staleOrderIds: string[] = result.rows.map(
    (r: Record<string, unknown>) => r["id"] as string,
  )

  if (staleOrderIds.length === 0) {
    return NextResponse.json({
      expired: 0,
      message: "No stale reserved orders found",
    })
  }

  log("info", "cron_expire_orders_start", {
    count: staleOrderIds.length,
    expirationMinutes: EXPIRATION_MINUTES,
  })

  // ── Expire each order through the domain layer ──
  let expired = 0
  const errors: Array<{ orderId: string; error: string }> = []

  for (const orderId of staleOrderIds) {
    try {
      await expireOrderById(orderId)
      expired++
    } catch (err: unknown) {
      // Log but continue — one failure shouldn't block others.
      // The domain layer's WHERE status = 'reserved' guard means
      // an order that was completed between our SELECT and the
      // expireOrderById call is a no-op, not an error.
      const errorMsg = err instanceof Error ? err.message : String(err)
      errors.push({ orderId, error: errorMsg })
      log("warn", "cron_expire_order_failed", { orderId, error: errorMsg })
    }
  }

  log("info", "cron_expire_orders_done", {
    expired,
    errors: errors.length,
    total: staleOrderIds.length,
  })

  return NextResponse.json({
    expired,
    errors: errors.length,
    total: staleOrderIds.length,
    ...(errors.length > 0 && { failedOrders: errors }),
  })
}
