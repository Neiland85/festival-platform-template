/**
 * Continuous Consistency Validator
 *
 * Runs during soak test to detect inconsistencies in real-time:
 * - Stuck jobs (in processing without lease)
 * - Duplicate operations
 * - Job loss (in DB but not in queues)
 * - Zombie state (completed but with active lease)
 * - Redis/Postgres divergence
 */

import { getRedis } from "@/lib/redis/client"
import { db } from "@/lib/db"
import { log } from "@/lib/logger"

export interface ConsistencyReport {
  timestamp: number
  allChecks: boolean
  stuckJobs: string[]
  duplicateOperations: number
  lostJobs: string[]
  zombieLeases: string[]
  redisPgDivergence: string[]
  warnings: string[]
}

/**
 * Run all consistency checks
 */
export async function runConsistencyCheck(): Promise<ConsistencyReport> {
  const report: ConsistencyReport = {
    timestamp: Date.now(),
    allChecks: true,
    stuckJobs: [],
    duplicateOperations: 0,
    lostJobs: [],
    zombieLeases: [],
    redisPgDivergence: [],
    warnings: [],
  }

  try {
    const redis = getRedis()!

    // ── Check 1: Stuck Jobs (in processing without lease) ──

    const processingJobs = await redis.lrange<string>("platform:queue:processing", 0, -1)

    for (const jobId of processingJobs) {
      const leaseKey = `platform:job_lease:${jobId}`
      const hasLease = await redis.exists(leaseKey)

      if (!hasLease) {
        report.stuckJobs.push(jobId)
        report.allChecks = false
      }
    }

    // ── Check 2: Duplicate Operations ──

    const duplicates = await db.query(
      `SELECT idempotency_token, COUNT(*) as cnt
       FROM applied_operations
       WHERE status = 'completed'
       GROUP BY idempotency_token
       HAVING COUNT(*) > 1`
    )

    report.duplicateOperations = duplicates.rows.length
    if (duplicates.rows.length > 0) {
      report.allChecks = false
      report.warnings.push(
        `Found ${duplicates.rows.length} duplicate completed operations`
      )
    }

    // ── Check 3: Lost Jobs (in DB but not in queues) ──

    const queuedJobs = await db.query(
      `SELECT job_id FROM platform_outbox WHERE status IN ('queued', 'processing')`
    )

    const redisJobIds = new Set(
      processingJobs.concat(
        await redis.lrange<string>("platform:queue:pending", 0, -1)
      )
    )

    for (const row of queuedJobs.rows) {
      const jobId = row.job_id
      if (!redisJobIds.has(jobId)) {
        // Check if it's actually in the system (might be being processed right now)
        const jobDataKey = `platform:job_data:${jobId}`
        const hasJobData = await redis.exists(jobDataKey)

        if (!hasJobData) {
          report.lostJobs.push(jobId)
          report.allChecks = false
        }
      }
    }

    // ── Check 4: Zombie Leases (completed jobs with active leases) ──

    const completedJobs = await db.query(
      `SELECT job_id FROM platform_outbox WHERE status = 'completed' LIMIT 50`
    )

    for (const row of completedJobs.rows) {
      const jobId = row.job_id
      const leaseKey = `platform:job_lease:${jobId}`
      const hasLease = await redis.exists(leaseKey)

      if (hasLease) {
        report.zombieLeases.push(jobId)
        // Not critical, but indicates cleanup failure
      }
    }

    // ── Check 5: Redis/Postgres Divergence ──

    // Jobs in Redis but not in Postgres
    for (const jobId of Array.from(redisJobIds)) {
      const pgJob = await db.query(
        `SELECT job_id FROM platform_outbox WHERE job_id = ? LIMIT 1`,
        [jobId]
      )

      if (pgJob.rows.length === 0) {
        report.redisPgDivergence.push(`Job ${jobId}: in Redis, not in Postgres`)
        report.allChecks = false
      }
    }

    // ── Check 6: Pending Operations (should timeout) ──

    const stuckPending = await db.query(
      `SELECT idempotency_token, operation_type
       FROM applied_operations
       WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '2 minutes'`
    )

    if (stuckPending.rows.length > 0) {
      report.warnings.push(
        `Found ${stuckPending.rows.length} operations stuck in PENDING state >2min`
      )
    }

    // ── Log Report ──

    if (!report.allChecks) {
      log("error", "consistency_check_failed", {
        stuckJobs: report.stuckJobs.length,
        duplicateOperations: report.duplicateOperations,
        lostJobs: report.lostJobs.length,
        zombieLeases: report.zombieLeases.length,
        redisPgDivergence: report.redisPgDivergence.length,
      })
    } else {
      log("info", "consistency_check_passed", {
        processingJobs: processingJobs.length,
        completedJobs: completedJobs.rows.length,
      })
    }
  } catch (error) {
    report.allChecks = false
    report.warnings.push(
      `Consistency check error: ${error instanceof Error ? error.message : String(error)}`
    )

    log("error", "consistency_check_error", {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return report
}

/**
 * Validate that the system hasn't suffered critical failures
 */
export async function validateCritical(): Promise<{ passed: boolean; issues: string[] }> {
  const report = await runConsistencyCheck()

  const issues: string[] = []

  if (report.stuckJobs.length > 0) {
    issues.push(`CRITICAL: ${report.stuckJobs.length} jobs stuck in processing`)
  }

  if (report.duplicateOperations > 0) {
    issues.push(`CRITICAL: ${report.duplicateOperations} duplicate operations detected`)
  }

  if (report.lostJobs.length > 0) {
    issues.push(`CRITICAL: ${report.lostJobs.length} jobs lost`)
  }

  if (report.redisPgDivergence.length > 0) {
    issues.push(
      `CRITICAL: ${report.redisPgDivergence.length} Redis/Postgres divergences`
    )
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

/**
 * Validate system for soak test (compatible with long-soak-runner)
 */
export async function validateSystem(): Promise<{
  overall: boolean
  results: Array<{ name: string; passed: boolean }>
}> {
  const report = await runConsistencyCheck()
  const critical = await validateCritical()

  const results = [
    {
      name: "No Stuck Jobs",
      passed: report.stuckJobs.length === 0,
    },
    {
      name: "No Duplicate Operations",
      passed: report.duplicateOperations === 0,
    },
    {
      name: "No Lost Jobs",
      passed: report.lostJobs.length === 0,
    },
    {
      name: "No Zombie Leases",
      passed: report.zombieLeases.length === 0,
    },
    {
      name: "Redis/Postgres Consistency",
      passed: report.redisPgDivergence.length === 0,
    },
  ]

  return {
    overall: results.every((r) => r.passed),
    results,
  }
}
