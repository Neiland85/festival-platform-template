/**
 * SRE Metrics Collector — Real Production Monitoring
 *
 * This is NOT cute metrics. This is what detects:
 * - Slow death (degradation over hours)
 * - Retry storms (feedback loops)
 * - Memory creep (silent leaks)
 * - Backlog explosion (queue overload)
 *
 * Pattern: Every 10-30 seconds, capture a snapshot.
 * After 6-12 hours, trends become OBVIOUS.
 */

import { getRedis } from "@/lib/redis/client"
import { db } from "@/lib/db"
import { log } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"

/**
 * The 12 metrics that matter for SRE
 */
export interface SRESnapshot {
  // Metadata
  timestamp: number
  timestamp_iso: string
  elapsed_seconds: number

  // 🔥 1. THROUGHPUT — Is system slowing down?
  jobs_processed_per_sec: number
  jobs_enqueued_per_sec: number

  // ⚡ 2. LATENCY END-TO-END — Are jobs getting slower?
  latency_p50_ms: number
  latency_p95_ms: number
  latency_p99_ms: number
  latency_max_ms: number

  // 🧵 3. BACKLOG — Are we falling behind?
  pending_queue_size: number
  processing_queue_size: number
  total_backlog: number
  backlog_growth_per_minute: number

  // 🔁 4. RETRIES — Is system unstable?
  retry_rate_per_sec: number
  retry_ratio_percent: number // retries / total jobs

  // 🧠 5. IDEMPOTENCY HITS — Are duplicates increasing?
  idempotency_hit_rate_percent: number

  // ⏱️ 6. LEASE HEALTH — Are workers failing to renew?
  lease_renewals_per_sec: number
  lease_expired_count: number
  lease_expired_rate_per_sec: number

  // 🧟 7. ZOMBIE DETECTION — Dead jobs still in queue?
  zombie_jobs_count: number // jobs in processing without lease

  // 🧹 8. REDIS MEMORY & KEYS — Is there a leak?
  redis_memory_used_mb: number
  redis_memory_growth_rate_mb_per_hour: number
  redis_keys_count: number
  redis_orphaned_keys_count: number
  redis_orphaned_ratio_percent: number

  // 🗄️ 9. POSTGRES HEALTH — Is DB degrading?
  postgres_active_connections: number
  postgres_idle_connections: number
  postgres_connection_utilization_percent: number
  postgres_slow_queries_count: number

  // 🔀 10. CONSISTENCY — Is data corrupted?
  redis_postgres_divergence_count: number // jobs in different states

  // 💣 11. ERROR RATE — Growing or stable?
  error_rate_percent: number
  errors_total_count: number

  // 📉 12. TIME DRIFT — Is processing slowing down?
  avg_processing_time_ms: number
  processing_slowdown_percent: number // vs first snapshot
}

/**
 * Trends over time (for detecting degradation)
 */
export interface SRETrend {
  metric_name: string
  start_value: number
  current_value: number
  change_percent: number
  trend: "stable" | "improving" | "degrading" | "critical"
  red_flag: boolean
  explanation: string
}

export class SREMetricsCollector {
  private startTime: number = Date.now()
  private snapshots: SRESnapshot[] = []
  private outputFile: string
  private lastSnapshot: SRESnapshot | null = null
  private baselineSnapshot: SRESnapshot | null = null

  constructor(outputFile: string = "sre-metrics.jsonl") {
    this.outputFile = outputFile
  }

  /**
   * Capture a snapshot of all 12 metrics
   */
  async captureSnapshot(): Promise<SRESnapshot> {
    const now = Date.now()
    const elapsedSeconds = (now - this.startTime) / 1000

    const snapshot: SRESnapshot = {
      timestamp: now,
      timestamp_iso: new Date(now).toISOString(),
      elapsed_seconds: elapsedSeconds,

      // Placeholders (will be populated)
      jobs_processed_per_sec: 0,
      jobs_enqueued_per_sec: 0,
      latency_p50_ms: 0,
      latency_p95_ms: 0,
      latency_p99_ms: 0,
      latency_max_ms: 0,
      pending_queue_size: 0,
      processing_queue_size: 0,
      total_backlog: 0,
      backlog_growth_per_minute: 0,
      retry_rate_per_sec: 0,
      retry_ratio_percent: 0,
      idempotency_hit_rate_percent: 0,
      lease_renewals_per_sec: 0,
      lease_expired_count: 0,
      lease_expired_rate_per_sec: 0,
      zombie_jobs_count: 0,
      redis_memory_used_mb: 0,
      redis_memory_growth_rate_mb_per_hour: 0,
      redis_keys_count: 0,
      redis_orphaned_keys_count: 0,
      redis_orphaned_ratio_percent: 0,
      postgres_active_connections: 0,
      postgres_idle_connections: 0,
      postgres_connection_utilization_percent: 0,
      postgres_slow_queries_count: 0,
      redis_postgres_divergence_count: 0,
      error_rate_percent: 0,
      errors_total_count: 0,
      avg_processing_time_ms: 0,
      processing_slowdown_percent: 0,
    }

    try {
      // ── 1. THROUGHPUT ──────────────────────────────
      const jobsProcessed = await this.getJobsProcessedCount()
      const jobsEnqueued = await this.getJobsEnqueuedCount()

      snapshot.jobs_processed_per_sec = this.calculateRate(
        this.lastSnapshot?.jobs_processed_per_sec || 0,
        jobsProcessed,
        elapsedSeconds
      )
      snapshot.jobs_enqueued_per_sec = this.calculateRate(
        this.lastSnapshot?.jobs_enqueued_per_sec || 0,
        jobsEnqueued,
        elapsedSeconds
      )

      // ── 2. LATENCY ────────────────────────────────
      const latencies = await this.getLatencyMetrics()
      snapshot.latency_p50_ms = latencies.p50
      snapshot.latency_p95_ms = latencies.p95
      snapshot.latency_p99_ms = latencies.p99
      snapshot.latency_max_ms = latencies.max

      // ── 3. BACKLOG ────────────────────────────────
      const redis = getRedis()!
      const pending = await redis.llen("platform:queue:pending")
      const processing = await redis.llen("platform:queue:processing")

      snapshot.pending_queue_size = pending
      snapshot.processing_queue_size = processing
      snapshot.total_backlog = pending + processing

      // Calculate backlog growth rate
      if (this.lastSnapshot) {
        const backlogDelta = snapshot.total_backlog - this.lastSnapshot.total_backlog
        const timeDelta = (snapshot.elapsed_seconds - this.lastSnapshot.elapsed_seconds) / 60 // minutes
        snapshot.backlog_growth_per_minute = timeDelta > 0 ? backlogDelta / timeDelta : 0
      }

      // ── 4. RETRIES ────────────────────────────────
      const retries = await this.getRetryMetrics()
      snapshot.retry_rate_per_sec = retries.rate
      snapshot.retry_ratio_percent = retries.ratio

      // ── 5. IDEMPOTENCY ────────────────────────────
      const idempotency = await this.getIdempotencyMetrics()
      snapshot.idempotency_hit_rate_percent = idempotency.hitRate

      // ── 6. LEASE HEALTH ───────────────────────────
      const leases = await this.getLeaseMetrics()
      snapshot.lease_renewals_per_sec = leases.renewalRate
      snapshot.lease_expired_count = leases.expiredCount
      snapshot.lease_expired_rate_per_sec = leases.expiredRate

      // ── 7. ZOMBIE JOBS ────────────────────────────
      snapshot.zombie_jobs_count = await this.getZombieJobsCount()

      // ── 8. REDIS MEMORY & KEYS ────────────────────
      const redisMemory = await this.getRedisMemoryMetrics()
      snapshot.redis_memory_used_mb = redisMemory.usedMb
      snapshot.redis_memory_growth_rate_mb_per_hour = redisMemory.growthRate
      snapshot.redis_keys_count = redisMemory.keysCount
      snapshot.redis_orphaned_keys_count = redisMemory.orphanedKeys
      snapshot.redis_orphaned_ratio_percent = redisMemory.orphanedRatio

      // ── 9. POSTGRES HEALTH ────────────────────────
      const pgHealth = await this.getPostgresHealthMetrics()
      snapshot.postgres_active_connections = pgHealth.activeConnections
      snapshot.postgres_idle_connections = pgHealth.idleConnections
      snapshot.postgres_connection_utilization_percent = pgHealth.utilizationPercent
      snapshot.postgres_slow_queries_count = pgHealth.slowQueriesCount

      // ── 10. CONSISTENCY ───────────────────────────
      snapshot.redis_postgres_divergence_count = await this.getConsistencyIssues()

      // ── 11. ERROR RATE ────────────────────────────
      const errors = await this.getErrorMetrics()
      snapshot.error_rate_percent = errors.rate
      snapshot.errors_total_count = errors.total

      // ── 12. TIME DRIFT ────────────────────────────
      const timeDrift = await this.getTimeDriftMetrics()
      snapshot.avg_processing_time_ms = timeDrift.avgTime
      snapshot.processing_slowdown_percent = timeDrift.slowdownPercent

      // Store snapshot
      this.snapshots.push(snapshot)
      if (!this.baselineSnapshot) {
        this.baselineSnapshot = snapshot
      }
      this.lastSnapshot = snapshot

      // Log to file
      this.logSnapshot(snapshot)

      // Log to console (summary)
      this.printSnapshotSummary(snapshot)

      return snapshot
    } catch (error) {
      log("error", "sre_metrics_collection_failed", {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Detect trends and anomalies
   */
  analyzeTrends(): SRETrend[] {
    if (this.snapshots.length < 2 || !this.baselineSnapshot) {
      return []
    }

    const trends: SRETrend[] = []
    const current = this.snapshots[this.snapshots.length - 1]

    // Helper to create trend
    const createTrend = (
      metricName: string,
      baselineValue: number,
      currentValue: number,
      isInversed: boolean = false // lower is worse (latency)
    ): SRETrend | null => {
      if (baselineValue === 0) return null

      const changePercent = ((currentValue - baselineValue) / baselineValue) * 100

      let trend: "stable" | "improving" | "degrading" | "critical"
      let redFlag = false

      if (isInversed) {
        // For metrics where lower is better
        if (changePercent < 5) trend = "stable"
        else if (changePercent < -5) trend = "improving"
        else if (changePercent < 20) trend = "degrading"
        else {
          trend = "critical"
          redFlag = true
        }
      } else {
        // For metrics where higher is better
        if (changePercent > -5) trend = "stable"
        else if (changePercent < -5 && changePercent > -15) trend = "degrading"
        else {
          trend = "critical"
          redFlag = true
        }
      }

      return {
        metric_name: metricName,
        start_value: baselineValue,
        current_value: currentValue,
        change_percent: changePercent,
        trend,
        red_flag: redFlag,
        explanation: `${metricName}: ${baselineValue.toFixed(2)} → ${currentValue.toFixed(2)} (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`,
      }
    }

    // Analyze key metrics
    trends.push(
      createTrend("Throughput (jobs/sec)", this.baselineSnapshot.jobs_processed_per_sec, current.jobs_processed_per_sec, true) // lower is worse
    )
    trends.push(
      createTrend("Latency P95 (ms)", this.baselineSnapshot.latency_p95_ms, current.latency_p95_ms, false) // higher is worse
    )
    trends.push(
      createTrend("Backlog", this.baselineSnapshot.total_backlog, current.total_backlog, true) // higher is worse
    )
    trends.push(
      createTrend("Retry Ratio (%)", this.baselineSnapshot.retry_ratio_percent, current.retry_ratio_percent, true) // higher is worse
    )
    trends.push(
      createTrend("Lease Expirations", this.baselineSnapshot.lease_expired_count, current.lease_expired_count, true) // higher is worse
    )
    trends.push(
      createTrend("Redis Memory (MB)", this.baselineSnapshot.redis_memory_used_mb, current.redis_memory_used_mb, true) // higher is worse
    )
    trends.push(
      createTrend("Zombie Jobs", this.baselineSnapshot.zombie_jobs_count, current.zombie_jobs_count, true) // higher is worse
    )

    return trends.filter((t) => t !== null) as SRETrend[]
  }

  /**
   * Get final report
   */
  generateReport(): string {
    if (this.snapshots.length === 0) {
      return "No snapshots collected"
    }

    const first = this.snapshots[0]
    const last = this.snapshots[this.snapshots.length - 1]
    const trends = this.analyzeTrends()

    let report = `
╔════════════════════════════════════════════════════════════════╗
║           SRE METRICS ANALYSIS REPORT                         ║
║           Soak Test: ${first.timestamp_iso.split("T")[0]}                              ║
╚════════════════════════════════════════════════════════════════╝

Duration: ${(last.elapsed_seconds / 60 / 60).toFixed(1)} hours (${last.elapsed_seconds.toFixed(0)} seconds)

📊 FINAL METRICS:
  Throughput: ${last.jobs_processed_per_sec.toFixed(1)} jobs/sec
  Backlog: ${last.total_backlog} jobs (pending: ${last.pending_queue_size}, processing: ${last.processing_queue_size})
  Latency P95: ${last.latency_p95_ms.toFixed(0)}ms
  Retry Ratio: ${last.retry_ratio_percent.toFixed(2)}%
  Redis Memory: ${last.redis_memory_used_mb.toFixed(1)} MB
  Zombie Jobs: ${last.zombie_jobs_count}
  DB Connections: ${last.postgres_active_connections}/${last.postgres_active_connections + last.postgres_idle_connections}

📈 TRENDS:
`

    const criticalTrends = trends.filter((t) => t.red_flag)
    const warningTrends = trends.filter((t) => t.trend === "degrading")
    const healthyTrends = trends.filter((t) => t.trend === "stable" || t.trend === "improving")

    if (criticalTrends.length > 0) {
      report += `\n🔴 CRITICAL (${criticalTrends.length}):\n`
      for (const trend of criticalTrends) {
        report += `  ${trend.explanation}\n`
      }
    }

    if (warningTrends.length > 0) {
      report += `\n🟡 DEGRADING (${warningTrends.length}):\n`
      for (const trend of warningTrends) {
        report += `  ${trend.explanation}\n`
      }
    }

    if (healthyTrends.length > 0) {
      report += `\n✅ STABLE/IMPROVING (${healthyTrends.length}):\n`
      for (const trend of healthyTrends) {
        report += `  ${trend.explanation}\n`
      }
    }

    // Death patterns
    report += `\n🧨 DEATH PATTERN CHECK:\n`

    const isSlow Death = trends.some(
      (t) => t.metric_name === "Latency P95 (ms)" && t.change_percent > 50
    )
    if (isSlow Death) {
      report += `  🔴 SLOW DEATH: Latency climbing (system degrading over time)\n`
    }

    const isRetryStorm = trends.some(
      (t) => t.metric_name === "Retry Ratio (%)" && t.change_percent > 100
    )
    if (isRetryStorm) {
      report += `  🔴 RETRY STORM: Feedback loop detected (failures → retries → more failures)\n`
    }

    const isMemoryCreep = trends.some(
      (t) => t.metric_name === "Redis Memory (MB)" && t.change_percent > 50
    )
    if (isMemoryCreep) {
      report += `  🔴 MEMORY CREEP: Memory growing without bound (leak)\n`
    }

    const isBacklogExplosion =
      last.total_backlog > 5000 && first.total_backlog < 1000
    if (isBacklogExplosion) {
      report += `  🔴 BACKLOG EXPLOSION: Queue overloaded (system can't keep up)\n`
    }

    if (
      !isSlow Death &&
      !isRetryStorm &&
      !isMemoryCreep &&
      !isBacklogExplosion
    ) {
      report += `  ✅ No death patterns detected\n`
    }

    // Final verdict
    const hasRedFlags = criticalTrends.length > 0
    const hasWarnings = warningTrends.length > 0

    report += `\n`
    if (hasRedFlags) {
      report += `❌ VERDICT: FAILED — Critical issues detected\n`
    } else if (hasWarnings) {
      report += `⚠️  VERDICT: MARGINAL — Degradation observed (needs investigation)\n`
    } else {
      report += `✅ VERDICT: PASSED — System stable throughout test\n`
    }

    return report
  }

  // ── Private helpers ────────────────────────────────────

  private async getJobsProcessedCount(): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM platform_outbox WHERE status = 'completed'`
    )
    return result.rows[0]?.count || 0
  }

  private async getJobsEnqueuedCount(): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM platform_outbox`
    )
    return result.rows[0]?.count || 0
  }

  private async getLatencyMetrics(): Promise<{
    p50: number
    p95: number
    p99: number
    max: number
  }> {
    try {
      const result = await db.query(
        `SELECT
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000)) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000)) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000)) as p99,
          MAX(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as max
         FROM platform_outbox
         WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '5 minutes'`
      )

      if (result.rows.length > 0) {
        return {
          p50: result.rows[0].p50 || 0,
          p95: result.rows[0].p95 || 0,
          p99: result.rows[0].p99 || 0,
          max: result.rows[0].max || 0,
        }
      }
    } catch (error) {
      log("warn", "latency_metrics_failed", {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return { p50: 0, p95: 0, p99: 0, max: 0 }
  }

  private async getRetryMetrics(): Promise<{ rate: number; ratio: number }> {
    try {
      const result = await db.query(
        `SELECT
          SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) as retried_count,
          COUNT(*) as total_count
         FROM platform_outbox
         WHERE updated_at > NOW() - INTERVAL '5 minutes'`
      )

      if (result.rows.length > 0) {
        const retriedCount = result.rows[0].retried_count || 0
        const totalCount = result.rows[0].total_count || 1

        return {
          rate: retriedCount / 5 / 60, // per second over 5 minutes
          ratio: (retriedCount / totalCount) * 100,
        }
      }
    } catch (error) {
      log("warn", "retry_metrics_failed", {})
    }

    return { rate: 0, ratio: 0 }
  }

  private async getIdempotencyMetrics(): Promise<{ hitRate: number }> {
    try {
      const result = await db.query(
        `SELECT
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(*) as total_count
         FROM applied_operations
         WHERE created_at > NOW() - INTERVAL '5 minutes'`
      )

      if (result.rows.length > 0) {
        const completedCount = result.rows[0].completed_count || 0
        const totalCount = result.rows[0].total_count || 1

        return {
          hitRate: (completedCount / totalCount) * 100,
        }
      }
    } catch (error) {
      log("warn", "idempotency_metrics_failed", {})
    }

    return { hitRate: 0 }
  }

  private async getLeaseMetrics(): Promise<{
    renewalRate: number
    expiredCount: number
    expiredRate: number
  }> {
    // Placeholder: in real implementation, track from Redis heartbeat logs
    return {
      renewalRate: 0,
      expiredCount: 0,
      expiredRate: 0,
    }
  }

  private async getZombieJobsCount(): Promise<number> {
    try {
      const redis = getRedis()!
      const processing = await redis.lrange<string>(
        "platform:queue:processing",
        0,
        -1
      )

      let zombieCount = 0
      for (const jobId of processing) {
        const leaseExists = await redis.exists(`platform:job_lease:${jobId}`)
        if (!leaseExists) {
          zombieCount++
        }
      }

      return zombieCount
    } catch (error) {
      log("warn", "zombie_jobs_count_failed", {})
      return 0
    }
  }

  private async getRedisMemoryMetrics(): Promise<{
    usedMb: number
    growthRate: number
    keysCount: number
    orphanedKeys: number
    orphanedRatio: number
  }> {
    try {
      const redis = getRedis()!
      const info = await redis.info("memory")

      let usedMb = 0
      if (info) {
        const match = info.match(/used_memory:(\d+)/)
        if (match) {
          usedMb = parseInt(match[1], 10) / 1024 / 1024
        }
      }

      const keys = await redis.keys("*")
      const keysCount = keys.length

      // Orphaned = keys without corresponding jobs
      const pending = await redis.lrange<string>(
        "platform:queue:pending",
        0,
        -1
      )
      const processing = await redis.lrange<string>(
        "platform:queue:processing",
        0,
        -1
      )
      const allJobs = new Set([...pending, ...processing])

      let orphanedKeys = 0
      for (const key of keys) {
        if (key.startsWith("platform:job_data:")) {
          const jobId = key.replace("platform:job_data:", "")
          if (!allJobs.has(jobId)) {
            orphanedKeys++
          }
        }
      }

      const growthRate = this.lastSnapshot
        ? ((usedMb - this.lastSnapshot.redis_memory_used_mb) /
            ((this.lastSnapshot.elapsed_seconds - this.lastSnapshot.elapsed_seconds) / 3600)) ||
          0
        : 0

      return {
        usedMb,
        growthRate,
        keysCount,
        orphanedKeys,
        orphanedRatio: keysCount > 0 ? (orphanedKeys / keysCount) * 100 : 0,
      }
    } catch (error) {
      log("warn", "redis_memory_metrics_failed", {})
      return {
        usedMb: 0,
        growthRate: 0,
        keysCount: 0,
        orphanedKeys: 0,
        orphanedRatio: 0,
      }
    }
  }

  private async getPostgresHealthMetrics(): Promise<{
    activeConnections: number
    idleConnections: number
    utilizationPercent: number
    slowQueriesCount: number
  }> {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity
        WHERE datname = current_database()
      `)

      const active = result.rows[0]?.active || 0
      const idle = result.rows[0]?.idle || 0
      const utilization = ((active / (active + idle)) * 100) || 0

      return {
        activeConnections: active,
        idleConnections: idle,
        utilizationPercent: utilization,
        slowQueriesCount: 0, // Placeholder
      }
    } catch (error) {
      log("warn", "postgres_health_metrics_failed", {})
      return {
        activeConnections: 0,
        idleConnections: 0,
        utilizationPercent: 0,
        slowQueriesCount: 0,
      }
    }
  }

  private async getConsistencyIssues(): Promise<number> {
    // Check for divergence between Redis and Postgres
    try {
      const redis = getRedis()!
      const processing = await redis.lrange<string>(
        "platform:queue:processing",
        0,
        -1
      )

      const pgResult = await db.query(
        `SELECT job_id FROM platform_outbox WHERE status = 'processing'`
      )
      const pgJobs = new Set(pgResult.rows.map((r) => r.job_id))

      let divergenceCount = 0
      for (const jobId of processing) {
        if (!pgJobs.has(jobId)) {
          divergenceCount++
        }
      }

      return divergenceCount
    } catch (error) {
      log("warn", "consistency_check_failed", {})
      return 0
    }
  }

  private async getErrorMetrics(): Promise<{ rate: number; total: number }> {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM platform_outbox WHERE status = 'failed'`
      )
      const total = result.rows[0]?.count || 0

      return {
        rate: total / (this.snapshots.length || 1),
        total,
      }
    } catch (error) {
      return { rate: 0, total: 0 }
    }
  }

  private async getTimeDriftMetrics(): Promise<{
    avgTime: number
    slowdownPercent: number
  }> {
    try {
      const result = await db.query(
        `SELECT
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_time
         FROM platform_outbox
         WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '5 minutes'`
      )

      const avgTime = result.rows[0]?.avg_time || 0

      const slowdownPercent = this.baselineSnapshot
        ? ((avgTime - this.baselineSnapshot.avg_processing_time_ms) /
            (this.baselineSnapshot.avg_processing_time_ms || 1)) *
          100
        : 0

      return {
        avgTime,
        slowdownPercent,
      }
    } catch (error) {
      return { avgTime: 0, slowdownPercent: 0 }
    }
  }

  private calculateRate(previousValue: number, currentValue: number, seconds: number): number {
    if (seconds === 0) return 0
    return (currentValue - previousValue) / seconds
  }

  private logSnapshot(snapshot: SRESnapshot): void {
    const line = JSON.stringify(snapshot) + "\n"
    fs.appendFileSync(this.outputFile, line)
  }

  private printSnapshotSummary(snapshot: SRESnapshot): void {
    const elapsedMin = (snapshot.elapsed_seconds / 60).toFixed(1)
    const throughputStr = `${snapshot.jobs_processed_per_sec.toFixed(1)}/s`
    const latencyStr = `P95: ${snapshot.latency_p95_ms.toFixed(0)}ms`
    const backlogStr = `Backlog: ${snapshot.total_backlog}`
    const retryStr = `Retries: ${snapshot.retry_ratio_percent.toFixed(1)}%`

    console.log(
      `[SRE] T+${elapsedMin}min | ${throughputStr} | ${latencyStr} | ${backlogStr} | ${retryStr}`
    )
  }
}
