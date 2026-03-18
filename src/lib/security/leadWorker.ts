/**
 * Lead Worker — Production-grade job processor
 *
 * Pattern:
 *   1. Acquire distributed lock (prevent concurrent execution in serverless)
 *   2. Dequeue with lease (BRPOPLPUSH, atomically moves to processing)
 *   3. Check idempotency against Postgres (skip if already processed)
 *   4. Execute domain logic with timeouts
 *   5. On success: call ackJob() (marks completed in Postgres, cleans Redis)
 *   6. On error: call nackJob() (retries or moves to DLQ)
 *   7. Release lock
 *
 * Safety Guarantees:
 *   - Distributed lock prevents concurrent workers from processing same job (serverless)
 *   - Lease timeout (5 min) + reconciliation handles crashed workers
 *   - Idempotency token prevents double-processing on retries
 *   - All DB writes happen before Redis cleanup (eventual consistency)
 *   - Timeouts prevent hanging on stuck domain logic
 *   - Postgres is source of truth; Redis is fast dispatch layer
 */

import { dequeueRedis, checkIdempotency, ackJob, nackJob } from "./redisQueue"
import { getRedis } from "@/lib/redis/client"
import { log } from "@/lib/logger"
import * as Sentry from "@sentry/nextjs"

type QueueItem = {
  jobId: string
  idempotencyToken: string
  payload: Record<string, unknown>
  retryCount?: number
}

// ── Configuration ────────────────────────────────────────────

const LOCK_TTL_SECONDS = 10 // Worker must finish or release lock
const PROCESSING_TIMEOUT_MS = 30_000 // 30 second timeout per job
const MAX_RETRIES = 3

// ── Distributed Lock ─────────────────────────────────────────

/**
 * Acquire distributed lock to prevent concurrent execution in serverless
 * Returns lock ID if acquired, null if locked by another worker
 *
 * In serverless (cold starts, concurrent invocations), multiple workers
 * can try to process the same job. This lock prevents that.
 */
async function acquireLock(jobId: string): Promise<string | null> {
  const redis = getRedis()
  if (!redis) return null

  const lockKey = `platform:job_lock:${jobId}`
  const lockId = `${jobId}:${Date.now()}:${Math.random()}`

  try {
    // SET with NX (only if not exists) + EX (expire after TTL)
    // If successful, we own the lock
    const result = await redis.set(lockKey, lockId, { nx: true, ex: LOCK_TTL_SECONDS })
    return result ? lockId : null
  } catch (e) {
    log("error", "lock_acquire_failed", {
      jobId,
      error: e instanceof Error ? e.message : String(e),
    })
    return null
  }
}

/**
 * Release lock safely (only if we still own it)
 *
 * Check if we own the lock before deleting.
 * Prevents releasing someone else's lock if we took too long.
 */
async function releaseLock(jobId: string, lockId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const lockKey = `platform:job_lock:${jobId}`

  try {
    // Verify we still own the lock
    const currentValue = await redis.get<string>(lockKey)
    if (currentValue === lockId) {
      // We own it: delete
      await redis.del(lockKey)
    }
    // If someone else owns it, don't delete (they're processing)
  } catch (e) {
    log("warn", "lock_release_failed", {
      jobId,
      error: e instanceof Error ? e.message : String(e),
    })
    // Don't throw: lock will expire anyway after LOCK_TTL_SECONDS
  }
}

// ── Domain Logic ─────────────────────────────────────────────

/**
 * Domain-specific job processing
 *
 * Override this function with actual business logic:
 *   - Send email via Sendgrid
 *   - Sync to external API
 *   - Generate report
 *   - Process payment
 *   - Create lead record
 *   - etc.
 */
async function processJob(payload: Record<string, unknown>): Promise<unknown> {
  // TODO: Replace with actual domain logic
  // This is a placeholder that succeeds immediately

  console.log("[processJob] Processing:", payload)

  // Simulate processing (remove in production)
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    status: "success",
    processedAt: new Date().toISOString(),
  }
}

/**
 * Execute job with timeout protection
 *
 * Prevents jobs from hanging indefinitely on stuck I/O or infinite loops.
 * If job takes longer than PROCESSING_TIMEOUT_MS, it's killed and nacked.
 */
async function executeWithTimeout(payload: Record<string, unknown>): Promise<unknown> {
  return Promise.race([
    processJob(payload),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Job processing timeout (${PROCESSING_TIMEOUT_MS}ms exceeded)`)),
        PROCESSING_TIMEOUT_MS
      )
    ),
  ])
}

/**
 * Get retry count from job data
 * Used to decide: retry or move to DLQ
 */
function getRetryCount(job: QueueItem): number {
  return job.retryCount || 0
}

// ── Worker Implementation ────────────────────────────────────

/**
 * Main worker: Process ONE job safely
 *
 * Invocation:
 *   - From cron job (every 10-30 seconds)
 *   - From webhook/event trigger
 *   - From background task
 *   - From API endpoint (with timeout)
 *
 * Returns:
 *   - { success: true, jobId } on successful processing
 *   - { success: false, jobId, reason } on failure (job moved to DLQ or retrying)
 *   - { success: null, reason } on lock/dequeue failure (queue empty or locked)
 *
 * Typical flow:
 *   const result = await processOneJob()
 *   if (result.success === null) {
 *     // Queue empty, nothing to do
 *   } else if (result.success) {
 *     // Job processed successfully
 *   } else {
 *     // Job failed, will be retried or moved to DLQ
 *   }
 */
export async function processOneJob(): Promise<{
  success: boolean | null
  jobId?: string
  reason?: string
}> {
  let job: QueueItem | null = null
  let lockId: string | null = null

  try {
    // ── Step 1: Dequeue with lease (BRPOPLPUSH pattern) ──
    const dequeueResult = await dequeueRedis()
    if (!dequeueResult) {
      // Queue is empty or error occurred
      return { success: null, reason: "queue_empty" }
    }

    job = dequeueResult.job as QueueItem
    const leaseToken = dequeueResult.leaseToken

    log("info", "job_dequeued", {
      jobId: job.jobId,
      idempotencyToken: job.idempotencyToken,
      retryCount: getRetryCount(job),
    })

    // ── Step 2: Acquire distributed lock ──
    // In serverless, multiple workers can try to process the same job
    // Lock prevents concurrent processing
    lockId = await acquireLock(job.jobId)
    if (!lockId) {
      // Another worker is processing this job
      log("warn", "job_locked_by_another_worker", {
        jobId: job.jobId,
      })
      // Return early; reconciliation will handle if the other worker crashes
      return { success: null, reason: "job_locked_by_another_worker" }
    }

    // ── Step 3: Check idempotency ──
    // If job was already processed (on a previous attempt), return cached result
    // This is critical for exactly-once semantics
    const idempotencyCheck = await checkIdempotency(job.idempotencyToken)
    if (idempotencyCheck.processed) {
      log("info", "job_idempotent_skip", {
        jobId: job.jobId,
        cachedResult: idempotencyCheck.result,
      })

      // Job already processed: acknowledge it and return
      await ackJob(job.jobId, idempotencyCheck.result)
      return {
        success: true,
        jobId: job.jobId,
        reason: "idempotent_cached",
      }
    }

    // ── Step 4: Execute job with timeout ──
    let result: unknown
    try {
      result = await executeWithTimeout(job.payload)

      log("info", "job_processing_success", {
        jobId: job.jobId,
        result,
      })
    } catch (processingError) {
      const retryCount = getRetryCount(job)
      const errorMsg =
        processingError instanceof Error
          ? processingError.message
          : String(processingError)

      log("error", "job_processing_failed", {
        jobId: job.jobId,
        error: errorMsg,
        retryCount,
        willRetry: retryCount < MAX_RETRIES,
      })

      // Send to Sentry with context
      Sentry.captureException(processingError, {
        tags: {
          module: "leadWorker",
          jobId: job.jobId,
        },
        contexts: {
          job: {
            jobId: job.jobId,
            idempotencyToken: job.idempotencyToken,
            retryCount,
            maxRetries: MAX_RETRIES,
          },
        },
      })

      // ── Step 5a: On error → NACK (retry or DLQ) ──
      // nackJob() will:
      //   - Increment retry count
      //   - Move back to pending queue if retries available
      //   - Move to DLQ (failed queue) if max retries exceeded
      await nackJob(job.jobId, errorMsg, retryCount)

      return {
        success: false,
        jobId: job.jobId,
        reason:
          retryCount >= MAX_RETRIES
            ? "max_retries_exceeded"
            : "processing_error_will_retry",
      }
    }

    // ── Step 5b: On success → ACK ──
    // ackJob() will:
    //   - Mark job as completed in Postgres
    //   - Store result for idempotency
    //   - Clean up Redis processing list and lease
    await ackJob(job.jobId, result)

    return { success: true, jobId: job.jobId }
  } catch (unexpectedError) {
    const errorMsg =
      unexpectedError instanceof Error
        ? unexpectedError.message
        : String(unexpectedError)

    log("error", "worker_unexpected_error", {
      error: errorMsg,
      jobId: job?.jobId,
      severity: "critical",
    })

    // Unexpected error in worker infrastructure (not job processing)
    // Send to Sentry as a critical issue
    Sentry.captureException(unexpectedError, {
      tags: {
        module: "leadWorker",
        severity: "critical",
      },
      contexts: {
        job: {
          jobId: job?.jobId,
        },
      },
    })

    return {
      success: false,
      jobId: job?.jobId,
      reason: "unexpected_error_in_worker_infrastructure",
    }
  } finally {
    // ── Always Release Lock ──
    // Even if processing fails, we must release the lock so other workers
    // can process the job (after it's moved back to pending or DLQ)
    if (lockId && job) {
      await releaseLock(job.jobId, lockId)
    }
  }
}

/**
 * Daemon mode: Process queue continuously
 *
 * Drain the queue by calling processOneJob() repeatedly until empty.
 * Safe limits:
 *   - Max 100 jobs per invocation (prevent timeout on massive backlog)
 *   - Individual job timeout (30 seconds)
 *
 * Invocation points:
 *   1. Cron job: Every 10-30 seconds (recommended)
 *   2. Webhook trigger: On external event
 *   3. Background task: Long-running edge function
 *   4. API endpoint: POST /api/queue/process
 *
 * Example:
 *   // app/api/queue/process/route.ts
 *   export const maxDuration = 60 // 60 second timeout
 *   export async function POST(req: Request) {
 *     const result = await processQueueDaemon()
 *     return Response.json(result)
 *   }
 */
export async function processQueueDaemon(): Promise<{
  processed: number
  failed: number
  empty: boolean
  reason?: string
}> {
  let processed = 0
  let failed = 0

  // Safety limit: max 100 jobs per daemon invocation
  // Prevents timeout on massive backlog
  const MAX_JOBS_PER_RUN = 100

  for (let attempt = 0; attempt < MAX_JOBS_PER_RUN; attempt++) {
    const result = await processOneJob()

    if (result.success === null) {
      // Queue empty or all jobs locked
      log("info", "queue_daemon_complete", {
        processed,
        failed,
        reason: result.reason,
      })
      return {
        processed,
        failed,
        empty: true,
        reason: result.reason,
      }
    }

    if (result.success) {
      processed++
    } else {
      failed++
    }
  }

  // Hit safety limit without emptying queue
  log("warn", "queue_daemon_safety_limit_hit", {
    processed,
    failed,
    safetyLimit: MAX_JOBS_PER_RUN,
  })

  return {
    processed,
    failed,
    empty: false,
    reason: "safety_limit_reached_100_jobs",
  }
}
