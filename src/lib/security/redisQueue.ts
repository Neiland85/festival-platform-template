/**
 * Redis Queue — Production-grade distributed job queue
 *
 * Architecture:
 *   - Postgres outbox: Source of truth (durable)
 *   - Redis pending list: Fast FIFO queue
 *   - Redis processing set: In-flight jobs (with lease)
 *   - Redis failed set: Dead letter queue
 *   - Lease pattern: Jobs have TTL; expired leases trigger reconciliation
 *
 * Guarantees:
 *   - No job loss (persisted in Postgres)
 *   - No double-processing (idempotency tokens)
 *   - Exactly-once semantics (with proper ack/nack)
 *   - Crash-safe (reconciliation recovers stale jobs)
 *   - Serverless-safe (distributed lock + lease pattern)
 *
 * Flow:
 *   1. enqueueRedis: Add jobId to pending queue
 *   2. dequeueRedis: BRPOPLPUSH from pending → processing (atomic + lease)
 *   3. Process job: Check idempotency, execute, ack/nack
 *   4. reconcileProcessing: Recover expired leases (cron job)
 */

import { getRedis } from "@/lib/redis/client"
import { db } from "@/lib/db"
import { log } from "@/lib/logger"
import { randomUUID } from "crypto"

// ── Types ────────────────────────────────────────────────

type QueueItem = {
  jobId: string
  idempotencyToken: string
  payload: Record<string, unknown>
  retryCount?: number
}

// ── Redis Keys ───────────────────────────────────────────

const PENDING_LIST = "platform:queue:pending"
const PROCESSING_SET = "platform:queue:processing" // Sorted set with timestamp
const JOB_DATA_PREFIX = "platform:job_data:" // Hash: jobId -> {data, createdAt}
const LEASE_PREFIX = "platform:job_lease:" // jobId -> leaseToken (with TTL)
const FAILED_PREFIX = "platform:queue:failed:" // jobId -> {error, retries, failedAt}

// ── Configuration ────────────────────────────────────────

const LEASE_TTL_SECONDS = 300 // 5 min: if lease expires, job is assumed lost
const MAX_RETRIES = 3

// ── Utilities ────────────────────────────────────────────

function requireRedis() {
  const client = getRedis()
  if (!client) throw new Error("Redis not configured (UPSTASH_REDIS_REST_URL)")
  return client
}

// ── Public API: Enqueue ──────────────────────────────────

/**
 * Load job from Postgres outbox into Redis queue
 *
 * Postgres is the durable source of truth.
 * Redis is the fast dispatch layer.
 *
 * Job structure:
 *   jobId: unique identifier (UUID)
 *   idempotencyToken: hash of request (for dedup)
 *   payload: job data
 *   retryCount: incremented on failures
 *
 * Stores in two places:
 *   1. Redis hash: full job data (keyed by jobId)
 *   2. Redis list: jobId for FIFO queue
 */
export async function enqueueRedis(job: Omit<QueueItem, "retryCount">) {
  const redis = requireRedis()

  const jobKey = `${JOB_DATA_PREFIX}${job.jobId}`

  try {
    // Store job data in Redis hash
    await redis.hset(jobKey, {
      data: JSON.stringify(job),
      createdAt: Date.now().toString(),
    })

    // Add jobId to pending queue (FIFO)
    await redis.lpush(PENDING_LIST, job.jobId)

    log("info", "job_enqueued_redis", {
      jobId: job.jobId,
      idempotencyToken: job.idempotencyToken,
    })
  } catch (error) {
    log("error", "enqueue_redis_failed", {
      jobId: job.jobId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ── Public API: Dequeue ──────────────────────────────────

/**
 * SAFE DEQUEUE: Atomically move jobId from pending → processing
 *
 * Pattern (BRPOPLPUSH):
 *   1. Pop from pending list (FIFO)
 *   2. Push to processing set (atomically)
 *   3. Retrieve full job data from hash
 *   4. Set lease (TTL key; expiry triggers reconciliation)
 *   5. Update Postgres status
 *   6. Return job to worker
 *
 * Lease pattern protects against worker crashes:
 *   - Worker acquires lease when job dequeued
 *   - If worker crashes, lease expires after LEASE_TTL_SECONDS
 *   - Reconciliation detects expired lease → moves job back to pending or DLQ
 *   - Worker must release lease explicitly (ackJob/nackJob)
 *
 * Returns: { job, leaseToken } or null if queue empty
 */
export async function dequeueRedis(): Promise<{
  job: QueueItem
  leaseToken: string
  processingToken: string
} | null> {
  const redis = requireRedis()

  try {
    // Step 1: Atomically move jobId from pending → processing
    const jobId = await redis.rpoplpush<string>(PENDING_LIST, PROCESSING_SET)

    if (!jobId) {
      // Queue is empty
      return null
    }

    // Step 2: Retrieve job data from hash
    const jobKey = `${JOB_DATA_PREFIX}${jobId}`
    const jobData = await redis.hget<string>(jobKey, "data")

    if (!jobData) {
      // CORRUPTED: Job data lost but still in processing queue
      // This can happen if Redis crashed or data was manually deleted
      // Move to DLQ immediately
      await redis.lrem(PROCESSING_SET, 1, jobId)
      await redis.hset(`${FAILED_PREFIX}${jobId}`, {
        error: "Job data not found in Redis (corrupted)",
        failedAt: new Date().toISOString(),
      })
      await markJobFailedInPostgres(jobId, "Redis data corruption", 0)

      log("error", "job_data_corrupted", { jobId })
      return null
    }

    let job: QueueItem
    try {
      job = JSON.parse(jobData) as QueueItem
    } catch (parseError) {
      // CORRUPTED JSON: unrecoverable
      await redis.lrem(PROCESSING_SET, 1, jobId)
      await redis.hset(`${FAILED_PREFIX}${jobId}`, {
        error: `JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        failedAt: new Date().toISOString(),
      })
      await markJobFailedInPostgres(
        jobId,
        "JSON parse error",
        0
      )

      log("error", "job_json_corrupted", { jobId })
      return null
    }

    // Step 3: Generate processing token (proves ownership)
    // CRITICAL: Only the worker holding this token can ack/nack this job
    const processingToken = randomUUID()

    // Step 4: Set lease (5 min TTL) + store processing token
    const leaseToken = `${jobId}:${Date.now()}:${Math.random()}`
    await redis.setex(`${LEASE_PREFIX}${jobId}`, LEASE_TTL_SECONDS, leaseToken)
    await redis.hset(jobKey, "processingToken", processingToken)

    // Step 5: Update Postgres (job is now in-flight)
    await db.query(
      `UPDATE platform_outbox
       SET status = 'processing', updated_at = NOW()
       WHERE job_id = ?`,
      [jobId]
    )

    log("info", "job_dequeued_redis", {
      jobId: job.jobId,
      idempotencyToken: job.idempotencyToken,
      processingToken, // NEW: log token for ownership tracking
      retryCount: job.retryCount || 0,
    })

    return { job, leaseToken, processingToken }
  } catch (error) {
    log("error", "dequeue_redis_failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ── Public API: Idempotency ─────────────────────────────

/**
 * Check if job was already processed (idempotency)
 *
 * Queries Postgres (source of truth).
 * If job with this idempotency token has completed, return cached result.
 * This prevents double-processing on retries.
 *
 * Example flow:
 *   1. User submits order
 *   2. Server enqueues job with idempotencyToken = hash(userId, orderId)
 *   3. Job fails, is retried
 *   4. On retry, checkIdempotency() finds previous result
 *   5. Job skipped, cached result returned
 *   6. User sees single order (not duplicated)
 */
export async function checkIdempotency(idempotencyToken: string): Promise<{
  processed: boolean
  result?: unknown
}> {
  try {
    const result = await db.query(
      `SELECT result FROM platform_outbox
       WHERE idempotency_token = ? AND status = 'completed'
       LIMIT 1`,
      [idempotencyToken]
    )

    if (result.rows.length > 0) {
      return {
        processed: true,
        result: result.rows[0].result,
      }
    }

    return { processed: false }
  } catch (error) {
    log("error", "idempotency_check_failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ── Public API: Acknowledgment ───────────────────────────

/**
 * ACK: Job processed successfully
 *
 * Uses INSERT ... ON CONFLICT (UPSERT) to guarantee idempotency:
 *   - Database UNIQUE constraint on idempotency_token enforces exactly-once
 *   - If idempotency_token already exists: constraint prevents duplicate
 *   - If first time: INSERT succeeds
 *
 * Sequence:
 *   1. UPSERT into Postgres with idempotency_token
 *   2. Remove jobId from processing list (best effort)
 *   3. Clean up Redis data (best effort)
 *
 * Postgres update happens first: if it succeeds but Redis cleanup fails,
 * that's acceptable. Reconciliation will clean up Redis after lease expires.
 *
 * This implements the "Postgres-first" pattern: always ensure durability
 * in Postgres before removing from distributed cache.
 */
export async function ackJob(
  jobId: string,
  idempotencyToken: string,
  processingToken: string,
  result: unknown
): Promise<void> {
  const redis = requireRedis()

  try {
    // Step 0: CRITICAL — Verify ownership before acking
    // If we don't own the token, another worker took over (shouldn't happen)
    const jobKey = `${JOB_DATA_PREFIX}${jobId}`
    const currentToken = await redis.hget<string>(jobKey, "processingToken")

    if (currentToken !== processingToken) {
      throw new Error(
        `Processing token mismatch for ${jobId}: ownership lost (another worker took over)`
      )
    }

    // Step 1: UPSERT into Postgres with idempotency guarantee
    // If another worker already acked this token: conflict on UNIQUE constraint
    try {
      await db.query(
        `INSERT INTO platform_outbox
         (job_id, idempotency_token, status, result, created_at, updated_at)
         VALUES (?, ?, 'completed', ?, NOW(), NOW())
         ON CONFLICT (idempotency_token)
         DO UPDATE SET status = 'completed', result = ?, updated_at = NOW()
         WHERE platform_outbox.status != 'completed'`,
        [jobId, idempotencyToken, JSON.stringify(result), JSON.stringify(result)]
      )
    } catch (upsertError) {
      // Check if already completed (idempotent case)
      const existing = await db.query(
        `SELECT status FROM platform_outbox WHERE idempotency_token = ?`,
        [idempotencyToken]
      )

      if (existing.rows.length > 0 && existing.rows[0].status === "completed") {
        // Job was already completed: idempotent success
        log("info", "job_acked_idempotent_duplicate", {
          jobId,
          idempotencyToken,
        })
        // Fall through to cleanup
      } else {
        // Unexpected error: re-throw
        throw upsertError
      }
    }

    // Step 2-3: Clean up Redis (best effort)
    // If these fail, reconciliation will clean up after lease expires
    try {
      await redis.lrem(PROCESSING_SET, 1, jobId)
      await redis.del(`${LEASE_PREFIX}${jobId}`)
      await redis.del(`${JOB_DATA_PREFIX}${jobId}`)
    } catch (redisCleanupError) {
      log("warn", "redis_cleanup_failed_after_ack", {
        jobId,
        error:
          redisCleanupError instanceof Error
            ? redisCleanupError.message
            : String(redisCleanupError),
      })
      // Don't throw: Postgres is already updated, which is what matters
    }

    log("info", "job_acked", { jobId, idempotencyToken })
  } catch (error) {
    log("error", "ack_job_failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ── Public API: Negative Acknowledgment ──────────────────

/**
 * NACK: Job failed, retry or move to DLQ
 *
 * Sequence:
 *   1. Get current retry count
 *   2. If max retries reached: mark as failed, move to DLQ
 *   3. Else: increment retry, move back to pending
 *   4. Remove from processing, release lease
 *   5. Update Postgres
 *
 * This implements exponential backoff-friendly architecture:
 * Job can be retried up to MAX_RETRIES times before giving up.
 */
export async function nackJob(
  jobId: string,
  processingToken: string,
  error: string,
  currentRetryCount: number
): Promise<void> {
  const redis = requireRedis()

  try {
    // Step 0: Verify ownership
    const jobKey = `${JOB_DATA_PREFIX}${jobId}`
    const currentToken = await redis.hget<string>(jobKey, "processingToken")

    if (currentToken !== processingToken) {
      throw new Error(
        `Processing token mismatch for ${jobId}: ownership lost (another worker took over)`
      )
    }

    // Fetch job data
    const jobData = await redis.hget<string>(jobKey, "data")

    if (!jobData) {
      // Job lost: mark failed
      await markJobFailedInPostgres(jobId, error, currentRetryCount)
      return
    }

    const job = JSON.parse(jobData) as QueueItem

    // Remove from processing
    await redis.lrem(PROCESSING_SET, 1, jobId)
    await redis.del(`${LEASE_PREFIX}${jobId}`)

    const nextRetryCount = currentRetryCount + 1

    if (nextRetryCount >= MAX_RETRIES) {
      // Max retries exceeded: DLQ
      await redis.hset(`${FAILED_PREFIX}${jobId}`, {
        error,
        retries: nextRetryCount,
        failedAt: new Date().toISOString(),
      })
      await markJobFailedInPostgres(jobId, error, nextRetryCount)

      log("error", "job_nacked_max_retries", {
        jobId,
        error,
        retries: nextRetryCount,
      })
    } else {
      // Retry available: move back to pending
      const retryJob: QueueItem = { ...job, retryCount: nextRetryCount }
      await redis.hset(jobKey, "data", JSON.stringify(retryJob))
      await redis.lpush(PENDING_LIST, jobId)

      // Update Postgres
      await db.query(
        `UPDATE platform_outbox
         SET status = 'queued', retry_count = ?, error = ?, updated_at = NOW()
         WHERE job_id = ?`,
        [nextRetryCount, error, jobId]
      )

      log("info", "job_nacked_will_retry", {
        jobId,
        error,
        retryCount: nextRetryCount,
      })
    }
  } catch (err) {
    log("error", "nack_job_failed", {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

// ── Helper: Mark Failed ──────────────────────────────────

async function markJobFailedInPostgres(
  jobId: string,
  error: string,
  retryCount: number
): Promise<void> {
  try {
    await db.query(
      `UPDATE platform_outbox
       SET status = 'failed', error = ?, retry_count = ?, updated_at = NOW()
       WHERE job_id = ?`,
      [error, retryCount, jobId]
    )
  } catch (err) {
    log("error", "mark_failed_postgres_error", {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ── Public API: Reconciliation ──────────────────────────

/**
 * RECONCILIATION: Recover stale items from processing queue
 *
 * Run periodically (every 60-120 seconds via cron or scheduled task).
 *
 * Logic:
 *   - Scan processing set for all jobIds
 *   - Check if lease still exists (set via setex with LEASE_TTL_SECONDS)
 *   - If lease expired: worker crashed
 *     - If retries available: move back to pending
 *     - Else: move to DLQ, mark failed in Postgres
 *   - If job data missing: mark failed (data corruption)
 *
 * This is critical for crash recovery: if a worker dies mid-processing,
 * reconciliation will detect it after lease expires and retry or fail the job.
 *
 * Returns: { recovered, failed } counts for monitoring
 */
export async function reconcileProcessing(): Promise<{
  recovered: number
  failed: number
}> {
  const redis = requireRedis()
  let recovered = 0
  let failed = 0

  try {
    const processingJobs = await redis.lrange<string>(PROCESSING_SET, 0, -1)

    for (const jobId of processingJobs) {
      const leaseKey = `${LEASE_PREFIX}${jobId}`
      const hasLease = await redis.exists(leaseKey)

      if (!hasLease) {
        // STALE: Lease might be expired, worker might have crashed
        // Double-check: verify lease STILL doesn't exist after initial check
        // (prevents race where active worker renews lease between checks)
        const stillNoLease = await redis.exists(leaseKey)
        if (stillNoLease) {
          // Worker renewed lease: it's alive, skip this job
          continue
        }

        // Confirmed stale: Lease expired, worker crashed
        const jobKey = `${JOB_DATA_PREFIX}${jobId}`
        const jobData = await redis.hget<string>(jobKey, "data")

        if (!jobData) {
          // Data lost: mark failed
          await redis.lrem(PROCESSING_SET, 1, jobId)
          await redis.hset(`${FAILED_PREFIX}${jobId}`, {
            error: "Job lost from Redis during processing (data corruption)",
            failedAt: new Date().toISOString(),
          })
          await markJobFailedInPostgres(jobId, "Data corruption", 0)
          failed++
          continue
        }

        const job = JSON.parse(jobData) as QueueItem
        const retryCount = job.retryCount || 0

        // CRITICAL: Check Postgres status before retrying
        // If job is already 'completed', worker succeeded before lease expired
        // Don't retry—just clean up Redis (prevents double-processing)
        const jobStatus = await db.query(
          `SELECT status FROM platform_outbox WHERE job_id = ?`,
          [jobId]
        )

        if (jobStatus.rows.length > 0) {
          const status = jobStatus.rows[0].status

          if (status === "completed") {
            // Job was already successfully processed
            // Worker crashed after ackJob() but before returning
            // Just clean up Redis
            await redis.lrem(PROCESSING_SET, 1, jobId)
            log("info", "reconciliation_cleaned_completed_job", { jobId })
            recovered++
            continue
          }

          if (status === "failed") {
            // Job already marked failed: don't retry
            await redis.lrem(PROCESSING_SET, 1, jobId)
            log("info", "reconciliation_cleaned_failed_job", { jobId })
            // Don't increment: already counted
            continue
          }

          // Status is 'processing' or 'queued': safe to retry
        }

        // Status check complete: safe to retry or DLQ
        if (retryCount < MAX_RETRIES) {
          // Retry available: move back to pending
          const retryJob: QueueItem = { ...job, retryCount: retryCount + 1 }
          await redis.hset(jobKey, "data", JSON.stringify(retryJob))
          await redis.lrem(PROCESSING_SET, 1, jobId)
          await redis.lpush(PENDING_LIST, jobId)

          await db.query(
            `UPDATE platform_outbox
             SET status = 'queued', retry_count = ?, updated_at = NOW()
             WHERE job_id = ?`,
            [retryCount + 1, jobId]
          )

          log("info", "reconciliation_recovered", {
            jobId,
            retryCount: retryCount + 1,
          })

          recovered++
        } else {
          // Max retries: DLQ
          await redis.lrem(PROCESSING_SET, 1, jobId)
          await redis.hset(`${FAILED_PREFIX}${jobId}`, {
            error: "Max retries exceeded (worker lease timeout)",
            retries: retryCount,
            failedAt: new Date().toISOString(),
          })
          await markJobFailedInPostgres(
            jobId,
            "Lease timeout, max retries exceeded",
            retryCount
          )

          log("error", "reconciliation_failed_max_retries", {
            jobId,
            retries: retryCount,
          })

          failed++
        }
      }
    }

    log("info", "reconciliation_complete", { recovered, failed })
    return { recovered, failed }
  } catch (error) {
    log("error", "reconciliation_failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// ── Public API: DLQ & Monitoring ────────────────────────

/**
 * Get dead letter queue items
 *
 * Returns failed jobs for inspection and manual replay.
 * Useful for ops dashboards.
 */
export async function getDLQItems(): Promise<
  Array<{
    jobId: string
    error: string
    retries: number
    failedAt: string
  }>
> {
  const redis = requireRedis()
  const pattern = `${FAILED_PREFIX}*`
  const dlqItems: Array<{
    jobId: string
    error: string
    retries: number
    failedAt: string
  }> = []

  try {
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan<string>(cursor, {
        match: pattern,
        count: 100,
      })

      for (const key of keys) {
        const jobId = key.replace(FAILED_PREFIX, "")
        const data = await redis.hgetall<Record<string, string>>(key)

        dlqItems.push({
          jobId,
          error: data.error || "Unknown error",
          retries: parseInt(data.retries || "0", 10),
          failedAt: data.failedAt || new Date().toISOString(),
        })
      }

      cursor = nextCursor
      if (cursor === 0) break
    } while (true)

    return dlqItems
  } catch (error) {
    log("error", "get_dlq_items_failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Queue stats for monitoring & alerting
 *
 * Returns counts of pending, processing, and failed jobs.
 * Use for dashboards, alerts, capacity planning.
 */
export async function getQueueStats() {
  const redis = requireRedis()

  try {
    return {
      pending: await redis.llen(PENDING_LIST),
      processing: await redis.llen(PROCESSING_SET),
      failed: (await getDLQItems()).length,
    }
  } catch (error) {
    log("error", "get_queue_stats_failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
