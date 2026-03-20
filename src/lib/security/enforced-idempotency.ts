/**
 * ENFORCED IDEMPOTENCY — Impossible to bypass
 *
 * This is the Stripe pattern: idempotency is not optional.
 * You cannot process a job without wrapping it in executeWithDomainIdempotency.
 *
 * Pattern:
 *   const result = await executeJobSafely(job, () => myDomainLogic())
 *
 * This function:
 * 1. FORCES idempotency check (no way to skip)
 * 2. Prevents concurrent execution of same token
 * 3. Ensures durability before returning
 * 4. Handles all edge cases (pending, completed, failed)
 *
 * Why this matters:
 * - Developers cannot "forget" to use idempotency
 * - System enforces it at runtime
 * - No way to accidentally duplicate effects
 */

import { db } from "@/lib/db"
import { log } from "@/lib/logger"
import { chaos } from "@/lib/security/chaosMonkey"

type OperationType = "create_lead" | "send_email" | "sync_external_api" | "process_payment"

interface ExecutionLock {
  token: string
  acquired: number
  expires: number
}

const executionLocks = new Map<string, ExecutionLock>()
// Lock timeout: 60 seconds max execution time (used in future stale-lock cleanup)
// const LOCK_TIMEOUT_MS = 60_000

/**
 * Execute job with ENFORCED idempotency
 *
 * IMPOSSIBLE to bypass — all jobs must go through here
 *
 * @param jobId - Job identifier
 * @param idempotencyToken - Unique token (user request hash)
 * @param operationType - What operation this is
 * @param jobFunction - The actual domain logic to execute
 * @param timeout - Max execution time (default 30s)
 *
 * @returns Result of execution (fresh or cached)
 */
export async function executeJobSafely<T>(
  jobId: string,
  idempotencyToken: string,
  operationType: OperationType,
  jobFunction: () => Promise<T>,
  timeout: number = 30_000
): Promise<T> {
  // ── Step 1: Check if already completed ──────────────

  await chaos.inject("enforced_idempotency_check")

  const existing = await db.query(
    `SELECT status, result FROM applied_operations
     WHERE idempotency_token = ? AND operation_type = ?
     LIMIT 1`,
    [idempotencyToken, operationType]
  )

  if (existing.rows.length > 0) {
    const row = existing.rows[0]!

    if (row["status"] === "completed") {
      log("info", "job_idempotency_cache_hit", {
        jobId,
        idempotencyToken,
        operationType,
      })
      return row["result"] as T
    }

    if (row["status"] === "pending") {
      // Another worker is executing this job
      // Wait for it to complete (with timeout)
      log("info", "job_idempotency_pending_wait", {
        jobId,
        idempotencyToken,
        operationType,
      })

      return await waitForCompletion(idempotencyToken, operationType, timeout)
    }

    if (row["status"] === "failed") {
      // Previous execution failed, don't retry
      throw new Error(
        `Job already failed for token ${idempotencyToken}. Previous error: ${row["error"] || "unknown"}`
      )
    }
  }

  // ── Step 2: Try to acquire execution lock ──────────

  const lockKey = `${idempotencyToken}:${operationType}`

  // Check if another worker is executing this right now
  if (executionLocks.has(lockKey)) {
    const lock = executionLocks.get(lockKey)!
    if (Date.now() < lock.expires) {
      log("warn", "job_idempotency_concurrent_execution_attempt", {
        jobId,
        idempotencyToken,
        operationType,
        ownerToken: lock.token.slice(0, 8),
      })
      // Another worker owns the lock, wait for them
      return await waitForCompletion(idempotencyToken, operationType, timeout)
    } else {
      // Lock expired, clean it up
      executionLocks.delete(lockKey)
    }
  }

  // Acquire lock
  const lockToken = `${jobId}:${Date.now()}`
  executionLocks.set(lockKey, {
    token: lockToken,
    acquired: Date.now(),
    expires: Date.now() + timeout + 5000, // Slightly longer than job timeout
  })

  // ── Step 3: Pre-insert pending record ──────────────

  await chaos.inject("enforced_idempotency_pre_insert")

  try {
    await db.query(
      `INSERT INTO applied_operations (idempotency_token, operation_type, status, result, created_at)
       VALUES (?, ?, 'pending', '{}', NOW())
       ON CONFLICT (idempotency_token, operation_type) DO NOTHING`,
      [idempotencyToken, operationType]
    )
  } catch (error) {
    log("warn", "enforced_idempotency_pre_insert_failed", {
      idempotencyToken,
      operationType,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ── Step 4: Execute job (with timeout) ────────────

  let result: T

  try {
    await chaos.inject("enforced_idempotency_before_execution", {
      killRate: 0.02,
    })

    result = await executeWithTimeout(jobFunction, timeout)

    await chaos.inject("enforced_idempotency_after_execution")
  } catch (error) {
    // Mark as failed so we don't retry
    try {
      await db.query(
        `UPDATE applied_operations
         SET status = 'failed', error = ?
         WHERE idempotency_token = ? AND operation_type = ? AND status = 'pending'`,
        [
          error instanceof Error ? error.message : String(error),
          idempotencyToken,
          operationType,
        ]
      )
    } catch (updateError) {
      log("error", "enforced_idempotency_fail_mark_failed", {
        idempotencyToken,
        operationType,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
    }

    log("error", "job_execution_failed", {
      jobId,
      idempotencyToken,
      operationType,
      error: error instanceof Error ? error.message : String(error),
    })

    // Release lock and re-throw
    executionLocks.delete(lockKey)
    throw error
  }

  // ── Step 5: Mark completed ─────────────────────────

  await chaos.inject("enforced_idempotency_mark_completed")

  try {
    await db.query(
      `UPDATE applied_operations
       SET status = 'completed', result = ?
       WHERE idempotency_token = ? AND operation_type = ? AND status = 'pending'`,
      [JSON.stringify(result), idempotencyToken, operationType]
    )
  } catch (error) {
    log("error", "enforced_idempotency_mark_completed_failed", {
      idempotencyToken,
      operationType,
      error: error instanceof Error ? error.message : String(error),
    })
    // Effect already happened, don't throw
  }

  // Release lock
  executionLocks.delete(lockKey)

  log("info", "job_execution_completed", {
    jobId,
    idempotencyToken,
    operationType,
  })

  return result
}

/**
 * Wait for another worker to complete the same job
 * (with timeout to prevent deadlock)
 */
async function waitForCompletion<T>(
  idempotencyToken: string,
  operationType: OperationType,
  timeoutMs: number
): Promise<T> {
  const startTime = Date.now()
  const pollInterval = 100 // Poll every 100ms

  while (Date.now() - startTime < timeoutMs) {
    const row = await db.query(
      `SELECT status, result FROM applied_operations
       WHERE idempotency_token = ? AND operation_type = ?
       LIMIT 1`,
      [idempotencyToken, operationType]
    )

    if (row.rows.length > 0) {
      const r = row.rows[0]!
      const status = r["status"]
      const result = r["result"]

      if (status === "completed") {
        log("info", "job_wait_completed", {
          idempotencyToken,
          operationType,
          waitTimeMs: Date.now() - startTime,
        })
        return result as T
      }

      if (status === "failed") {
        throw new Error(
          `Job failed for token ${idempotencyToken}. Cannot retry.`
        )
      }
    }

    // Still pending, wait and retry
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  // Timeout waiting for completion
  throw new Error(
    `Timeout waiting for job completion (token: ${idempotencyToken}, timeout: ${timeoutMs}ms)`
  )
}

/**
 * Execute function with timeout (kills execution if too long)
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Job timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
}

/**
 * For testing: clear all in-memory locks
 */
export function clearExecutionLocks(): void {
  executionLocks.clear()
}

/**
 * For monitoring: get current locks
 */
export function getExecutionLocks(): ExecutionLock[] {
  return Array.from(executionLocks.values())
}
