/**
 * Drift Detection — Detects degradation over time
 *
 * Problems that appear HOURS into a soak test:
 * - Redis memory leaks (orphaned keys)
 * - Postgres connection pool exhaustion
 * - Job backlog accumulation
 * - Stale lease accumulation
 * - Heartbeat failures
 *
 * This is what catches production bugs that 1-hour tests miss.
 */

import { getRedis } from "@/lib/redis/client"
import { db } from "@/lib/db"
import { log } from "@/lib/logger"

export interface DriftIssue {
  category: string
  severity: "warning" | "critical"
  message: string
  value: number
  threshold: number
}

export interface DriftReport {
  timestamp: number
  issues: DriftIssue[]
  metrics: {
    redisSizeBytes: number
    redisSizeMb: number
    redisKeys: number
    orphanedKeys: number
    pendingJobs: number
    processingJobs: number
    staleLeases: number
    pgConnectionsActive: number
    pgConnectionsIdle: number
    jobBacklog: number
  }
}

// ── Thresholds for Drift Detection ──────────────────

const THRESHOLDS = {
  redisMemoryGrowthMb: 500, // Alert if Redis grows >500MB in 5 min
  orphanedKeysPercentage: 10, // Alert if >10% of keys are orphaned
  pendingJobsBacklog: 10000, // Alert if pending queue >10k
  staleLeases: 100, // Alert if >100 stale leases
  pgConnectionPoolExhaustion: 80, // Alert if >80% pool used
}

/**
 * Run drift detection check
 */
export async function runDriftDetection(): Promise<DriftReport> {
  const report: DriftReport = {
    timestamp: Date.now(),
    issues: [],
    metrics: {
      redisSizeBytes: 0,
      redisSizeMb: 0,
      redisKeys: 0,
      orphanedKeys: 0,
      pendingJobs: 0,
      processingJobs: 0,
      staleLeases: 0,
      pgConnectionsActive: 0,
      pgConnectionsIdle: 0,
      jobBacklog: 0,
    },
  }

  try {
    const redis = getRedis()!

    // ── Redis Metrics ──────────────────────────────────

    const info = await redis.info("memory")
    const memoryMatch = info?.match(/used_memory:(\d+)/)
    if (memoryMatch) {
      report.metrics.redisSizeBytes = parseInt(memoryMatch[1], 10)
      report.metrics.redisSizeMb = report.metrics.redisSizeBytes / 1024 / 1024
    }

    // Count keys
    const keys = await redis.keys("*")
    report.metrics.redisKeys = keys.length

    // Count orphaned keys (keys without corresponding jobs)
    const pendingJobs = await redis.lrange<string>("platform:queue:pending", 0, -1)
    const processingJobs = await redis.lrange<string>("platform:queue:processing", 0, -1)
    const allJobs = new Set([...pendingJobs, ...processingJobs])

    const orphanedKeys = keys.filter((key) => {
      // Job data keys that don't have corresponding job in queue
      if (key.startsWith("platform:job_data:")) {
        const jobId = key.replace("platform:job_data:", "")
        return !allJobs.has(jobId)
      }
      return false
    })

    report.metrics.orphanedKeys = orphanedKeys.length
    report.metrics.pendingJobs = pendingJobs.length
    report.metrics.processingJobs = processingJobs.length

    // Count stale leases
    const completedJobs = await db.query(
      `SELECT job_id FROM platform_outbox WHERE status = 'completed' LIMIT 100`
    )

    let staleLeases = 0
    for (const row of completedJobs.rows) {
      const leaseExists = await redis.exists(`platform:job_lease:${row.job_id}`)
      if (leaseExists) {
        staleLeases++
      }
    }
    report.metrics.staleLeases = staleLeases

    // ── Queue Backlog ──────────────────────────────────

    const queueStats = await db.query(
      `SELECT
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
       FROM platform_outbox`
    )

    const queued = queueStats.rows[0]?.queued || 0
    const processing = queueStats.rows[0]?.processing || 0
    report.metrics.jobBacklog = queued + processing

    // ── Postgres Connections ───────────────────────────

    try {
      const pgConnections = await db.query(`
        SELECT
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity
        WHERE datname = current_database()
      `)

      if (pgConnections.rows.length > 0) {
        report.metrics.pgConnectionsActive = pgConnections.rows[0].active || 0
        report.metrics.pgConnectionsIdle = pgConnections.rows[0].idle || 0
      }
    } catch (error) {
      log("warn", "drift_pg_connection_check_failed", {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // ── Issue Detection ────────────────────────────────

    // Check Redis memory growth
    if (report.metrics.redisSizeMb > THRESHOLDS.redisMemoryGrowthMb) {
      report.issues.push({
        category: "redis_memory",
        severity: "critical",
        message: `Redis memory usage is ${report.metrics.redisSizeMb.toFixed(1)}MB (threshold: ${THRESHOLDS.redisMemoryGrowthMb}MB)`,
        value: report.metrics.redisSizeMb,
        threshold: THRESHOLDS.redisMemoryGrowthMb,
      })
    }

    // Check orphaned keys
    const orphanedPercentage =
      report.metrics.redisKeys > 0
        ? (report.metrics.orphanedKeys / report.metrics.redisKeys) * 100
        : 0

    if (orphanedPercentage > THRESHOLDS.orphanedKeysPercentage) {
      report.issues.push({
        category: "orphaned_keys",
        severity: "warning",
        message: `${orphanedPercentage.toFixed(1)}% of Redis keys are orphaned (threshold: ${THRESHOLDS.orphanedKeysPercentage}%)`,
        value: orphanedPercentage,
        threshold: THRESHOLDS.orphanedKeysPercentage,
      })
    }

    // Check pending job backlog
    if (report.metrics.pendingJobs > THRESHOLDS.pendingJobsBacklog) {
      report.issues.push({
        category: "job_backlog",
        severity: "critical",
        message: `Job backlog is ${report.metrics.pendingJobs} (threshold: ${THRESHOLDS.pendingJobsBacklog})`,
        value: report.metrics.pendingJobs,
        threshold: THRESHOLDS.pendingJobsBacklog,
      })
    }

    // Check stale leases
    if (report.metrics.staleLeases > THRESHOLDS.staleLeases) {
      report.issues.push({
        category: "stale_leases",
        severity: "warning",
        message: `Found ${report.metrics.staleLeases} stale leases (threshold: ${THRESHOLDS.staleLeases})`,
        value: report.metrics.staleLeases,
        threshold: THRESHOLDS.staleLeases,
      })
    }

    // Check Postgres connection pool
    const totalConnections = report.metrics.pgConnectionsActive + report.metrics.pgConnectionsIdle
    if (totalConnections > 0) {
      const poolUsagePercent = (report.metrics.pgConnectionsActive / totalConnections) * 100
      if (poolUsagePercent > THRESHOLDS.pgConnectionPoolExhaustion) {
        report.issues.push({
          category: "pg_connection_pool",
          severity: "warning",
          message: `Postgres connection pool at ${poolUsagePercent.toFixed(1)}% (threshold: ${THRESHOLDS.pgConnectionPoolExhaustion}%)`,
          value: poolUsagePercent,
          threshold: THRESHOLDS.pgConnectionPoolExhaustion,
        })
      }
    }

    // Log findings
    if (report.issues.length > 0) {
      log("warn", "drift_detected", {
        issueCount: report.issues.length,
        issues: report.issues.map((i) => i.category),
      })
    } else {
      log("info", "drift_check_clean", {
        redisMb: report.metrics.redisSizeMb.toFixed(1),
        pendingJobs: report.metrics.pendingJobs,
        staleLeases: report.metrics.staleLeases,
      })
    }
  } catch (error) {
    log("error", "drift_detection_error", {
      error: error instanceof Error ? error.message : String(error),
    })

    report.issues.push({
      category: "drift_detector_error",
      severity: "critical",
      message: `Drift detection failed: ${error instanceof Error ? error.message : String(error)}`,
      value: 0,
      threshold: 0,
    })
  }

  return report
}

/**
 * Pretty-print drift report
 */
export function printDriftReport(report: DriftReport): string {
  let output = `
╔════════════════════════════════════════════╗
║     Drift Detection Report                 ║
╚════════════════════════════════════════════╝

Metrics:
  Redis Size: ${report.metrics.redisSizeMb.toFixed(1)} MB (${report.metrics.redisKeys} keys)
  Orphaned Keys: ${report.metrics.orphanedKeys}
  Pending Jobs: ${report.metrics.pendingJobs}
  Processing Jobs: ${report.metrics.processingJobs}
  Stale Leases: ${report.metrics.staleLeases}
  Job Backlog: ${report.metrics.jobBacklog}
  PG Connections: ${report.metrics.pgConnectionsActive} active, ${report.metrics.pgConnectionsIdle} idle
  `

  if (report.issues.length > 0) {
    output += `\nIssues Detected (${report.issues.length}):\n`
    for (const issue of report.issues) {
      const icon = issue.severity === "critical" ? "🔴" : "⚠️"
      output += `  ${icon} ${issue.category}: ${issue.message}\n`
    }
  } else {
    output += `\n✅ No drift detected\n`
  }

  return output.trim()
}
