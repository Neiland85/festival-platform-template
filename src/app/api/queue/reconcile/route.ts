/**
 * Queue Reconciliation Endpoint
 *
 * Purpose: Recover stale jobs from the processing queue
 *
 * What it does:
 *   1. Scans Redis processing set for all jobIds
 *   2. Checks if lease (TTL key) still exists
 *   3. If lease expired: worker crashed
 *     - Checks Postgres status: if 'completed', just clean up (prevents double-processing)
 *     - If not completed: retry job (if retries available) or move to DLQ
 *   4. Returns metrics: recovered and failed counts
 *
 * How to invoke:
 *   - Cron job: Every 60-120 seconds via Vercel/Upstash
 *   - See docs/QUEUE_RECONCILIATION.md for setup instructions
 *   - HTTP endpoint: POST to this URL with Authorization header
 *
 * Authorization:
 *   - Protect with API key or IP allowlist in production
 *   - Only safe to run repeatedly (idempotent)
 *
 * Performance:
 *   - Scales with processing queue size
 *   - With default config: ~100-500ms for typical queue
 *   - If queue is large (10k+ items): increase timeout
 */

import { reconcileProcessing } from "@/lib/security/redisQueue"
import { log } from "@/lib/logger"
import { serverEnv } from "@/lib/env"

export const maxDuration = 60 // 60 second timeout (needed if queue is large)
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    // Optional: Verify authorization (API key, IP, etc.)
    const authHeader = req.headers.get("authorization")
    const expectedKey = serverEnv.QUEUE_RECONCILE_KEY

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      log("warn", "reconcile_unauthorized", { authHeader: authHeader?.slice(0, 20) })
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Run reconciliation
    const startTime = Date.now()
    const result = await reconcileProcessing()
    const duration = Date.now() - startTime

    // Log result
    log("info", "reconciliation_completed", {
      recovered: result.recovered,
      failed: result.failed,
      durationMs: duration,
    })

    return Response.json(
      {
        success: true,
        recovered: result.recovered,
        failed: result.failed,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    log("error", "reconciliation_endpoint_error", {
      error: error instanceof Error ? error.message : String(error),
    })

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check / manual testing
 *
 * Usage:
 *   curl https://yourapp.com/api/queue/reconcile
 *
 * Response:
 *   { status: "ok", message: "POST to run reconciliation" }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: Request) {
  return Response.json(
    {
      status: "ok",
      message: "POST to this endpoint to run queue reconciliation",
      note: "Requires QUEUE_RECONCILE_KEY in Authorization header",
    },
    { status: 200 }
  )
}
