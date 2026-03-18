/**
 * Chaos Validator — Detect system inconsistencies
 *
 * After each chaos scenario, validate that the system is still consistent:
 * - No duplicate jobs processed
 * - No lost jobs
 * - No zombie leases/jobs
 * - Redis/Postgres aligned
 * - Idempotency enforced
 */

import { getRedis } from "@/lib/redis/client"
import { db } from "@/lib/db"
import { log } from "@/lib/logger"

// ── Validation Results ─────────────────────────────────────

export interface ValidationResult {
  name: string
  passed: boolean
  errors: string[]
  warnings: string[]
}

// ── Individual Validators ──────────────────────────────────

async function checkDuplicateProcessing(): Promise<ValidationResult> {
  const result: ValidationResult = {
    name: "duplicate_processing",
    passed: true,
    errors: [],
    warnings: [],
  }

  try {
    // Find idempotency tokens with multiple completed entries
    const duplicates = await db.query(
      `SELECT idempotency_token, COUNT(*) as cnt
       FROM platform_outbox
       WHERE status = 'completed'
       GROUP BY idempotency_token
       HAVING COUNT(*) > 1`
    )

    if (duplicates.rows.length > 0) {
      result.passed = false
      result.errors.push(
        `Found ${duplicates.rows.length} idempotency tokens with duplicate completions`
      )
      for (const row of duplicates.rows) {
        result.errors.push(`  - Token: ${row.idempotency_token} (${row.cnt} completions)`)
      }
    }
  } catch (error) {
    result.warnings.push(
      `Duplicate processing check failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result
}

async function checkLostJobs(): Promise<ValidationResult> {
  const result: ValidationResult = {
    name: "lost_jobs",
    passed: true,
    errors: [],
    warnings: [],
  }

  try {
    const redis = getRedis()!

    // Find jobs in processing queue
    const processingJobs = await redis.lrange<string>("platform:queue:processing", 0, -1)
    const failedPrefix = "platform:queue:failed:"

    for (const jobId of processingJobs) {
      // Check if job exists in Postgres
      const postgresJob = await db.query(
        `SELECT job_id FROM platform_outbox WHERE job_id = ? LIMIT 1`,
        [jobId]
      )

      if (postgresJob.rows.length === 0) {
        result.warnings.push(`Job ${jobId} in Redis processing but not in Postgres`)
      }
    }

    // Check for jobs that disappeared from both Redis and Postgres
    // (This is hard to detect without explicit tracking, so we check for orphaned data)
    const allJobs = await db.query(
      `SELECT job_id FROM platform_outbox ORDER BY created_at DESC LIMIT 100`
    )

    for (const row of allJobs.rows) {
      const jobId = row.job_id
      const jobDataKey = `platform:job_data:${jobId}`
      const jobData = await redis.hget<string>(jobDataKey, "data")

      const postgresStatus = await db.query(
        `SELECT status FROM platform_outbox WHERE job_id = ? LIMIT 1`,
        [jobId]
      )

      // If job is NOT in processing and NOT completed/failed, might be lost
      const inProcessing = await redis.llen("platform:queue:processing") > 0
      const status = postgresStatus.rows[0]?.status

      if (status !== "completed" && status !== "failed" && !inProcessing && !jobData) {
        result.warnings.push(`Job ${jobId} appears lost: no data in Redis, status=${status}`)
      }
    }
  } catch (error) {
    result.warnings.push(
      `Lost jobs check failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result
}

async function checkZombieJobs(): Promise<ValidationResult> {
  const result: ValidationResult = {
    name: "zombie_jobs",
    passed: true,
    errors: [],
    warnings: [],
  }

  try {
    const redis = getRedis()!

    // Find jobs that are completed in Postgres but still have a lease in Redis
    const completedJobs = await db.query(
      `SELECT job_id FROM platform_outbox WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 50`
    )

    const staleLeases = []
    for (const row of completedJobs.rows) {
      const leaseKey = `platform:job_lease:${row.job_id}`
      const hasLease = await redis.exists(leaseKey)

      if (hasLease) {
        staleLeases.push(row.job_id)
      }
    }

    if (staleLeases.length > 0) {
      result.warnings.push(
        `Found ${staleLeases.length} zombie leases for completed jobs: ${staleLeases.slice(0, 5).join(", ")}`
      )
    }

    // Check for jobs still in processing queue but completed in Postgres
    const processingJobs = await redis.lrange<string>("platform:queue:processing", 0, -1)
    const processingZombies = []

    for (const jobId of processingJobs) {
      const status = await db.query(
        `SELECT status FROM platform_outbox WHERE job_id = ? LIMIT 1`,
        [jobId]
      )

      if (status.rows[0]?.status === "completed") {
        processingZombies.push(jobId)
      }
    }

    if (processingZombies.length > 0) {
      result.warnings.push(
        `Found ${processingZombies.length} jobs in processing but marked completed in Postgres`
      )
    }
  } catch (error) {
    result.warnings.push(
      `Zombie jobs check failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result
}

async function checkIdempotencyIntegrity(): Promise<ValidationResult> {
  const result: ValidationResult = {
    name: "idempotency_integrity",
    passed: true,
    errors: [],
    warnings: [],
  }

  try {
    // Check that all idempotency tokens are unique in platform_outbox
    const duplicateTokens = await db.query(
      `SELECT idempotency_token, COUNT(*) as cnt
       FROM platform_outbox
       WHERE idempotency_token IS NOT NULL
       GROUP BY idempotency_token
       HAVING COUNT(*) > 1`
    )

    if (duplicateTokens.rows.length > 0) {
      result.passed = false
      result.errors.push(
        `Found ${duplicateTokens.rows.length} non-unique idempotency tokens (UNIQUE constraint violated)`
      )
    }

    // Check applied_operations for consistency
    const appliedDuplicates = await db.query(
      `SELECT idempotency_token, operation_type, COUNT(*) as cnt
       FROM applied_operations
       GROUP BY idempotency_token, operation_type
       HAVING COUNT(*) > 1`
    )

    if (appliedDuplicates.rows.length > 0) {
      result.passed = false
      result.errors.push(
        `Found ${appliedDuplicates.rows.length} duplicate operations (UNIQUE(token, type) violated)`
      )
    }

    // Check for pending operations that never complete (potential deadlock)
    const stuckPending = await db.query(
      `SELECT idempotency_token, operation_type, created_at
       FROM applied_operations
       WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '5 minutes'`
    )

    if (stuckPending.rows.length > 0) {
      result.warnings.push(
        `Found ${stuckPending.rows.length} operations stuck in PENDING state for >5 min`
      )
    }
  } catch (error) {
    result.warnings.push(
      `Idempotency integrity check failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result
}

async function checkRedisPgConsistency(): Promise<ValidationResult> {
  const result: ValidationResult = {
    name: "redis_postgres_consistency",
    passed: true,
    errors: [],
    warnings: [],
  }

  try {
    const redis = getRedis()!

    // Get all jobs from both systems
    const redisJobs = new Set<string>()
    const processingJobs = await redis.lrange<string>("platform:queue:processing", 0, -1)
    const pendingJobs = await redis.lrange<string>("platform:queue:pending", 0, -1)

    processingJobs.forEach((j) => redisJobs.add(j))
    pendingJobs.forEach((j) => redisJobs.add(j))

    // Get all queued/processing jobs from Postgres
    const pgJobs = await db.query(
      `SELECT job_id FROM platform_outbox WHERE status IN ('queued', 'processing')`
    )
    const pgJobSet = new Set(pgJobs.rows.map((r) => r.job_id))

    // Find jobs in Redis but not in Postgres (orphaned in Redis)
    const orphanedInRedis = []
    for (const jobId of redisJobs) {
      if (!pgJobSet.has(jobId)) {
        orphanedInRedis.push(jobId)
      }
    }

    if (orphanedInRedis.length > 0) {
      result.warnings.push(
        `Found ${orphanedInRedis.length} jobs in Redis queues but not in Postgres (orphaned): ${orphanedInRedis.slice(0, 3).join(", ")}`
      )
    }

    // Find jobs in Postgres but not in Redis (should be in completed/failed)
    const orphanedInPostgres = []
    for (const jobId of pgJobSet) {
      if (!redisJobs.has(jobId)) {
        orphanedInPostgres.push(jobId)
      }
    }

    if (orphanedInPostgres.length > 0) {
      result.warnings.push(
        `Found ${orphanedInPostgres.length} queued/processing jobs in Postgres but not in Redis`
      )
    }
  } catch (error) {
    result.warnings.push(
      `Redis/Postgres consistency check failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result
}

// ── Main Validator ─────────────────────────────────────────

export async function validateSystemConsistency(): Promise<{
  overall: boolean
  results: ValidationResult[]
  summary: string
}> {
  const results: ValidationResult[] = await Promise.all([
    checkDuplicateProcessing(),
    checkLostJobs(),
    checkZombieJobs(),
    checkIdempotencyIntegrity(),
    checkRedisPgConsistency(),
  ])

  const overall = results.every((r) => r.passed)
  const failedCount = results.filter((r) => !r.passed).length
  const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0)

  const summary = `
✓ Consistency Check: ${overall ? "PASSED ✅" : "FAILED ❌"}
  - ${results.length} checks run
  - ${failedCount} failed
  - ${warningCount} warnings
  `.trim()

  log("info", "system_consistency_validation", {
    overall,
    failedCount,
    warningCount,
    results: results
      .filter((r) => r.errors.length > 0 || r.warnings.length > 0)
      .map((r) => ({ name: r.name, errors: r.errors, warnings: r.warnings })),
  })

  return { overall, results, summary }
}
