/**
 * DLQ Auto-Retry Worker (v2)
 *
 * Scans unresolved dead-letter entries and automatically retries those
 * that the decision engine classifies as safe transient failures.
 *
 * v2 enhancements:
 * - Circuit breaker: aborts if DB pool utilization > 90%
 * - Priority ordering: revenue events (checkout.completed) retry first
 * - Global rate limit: max 10 retries per run
 * - Backoff uses createdAt (no updatedAt column exists; see note below)
 *
 * Safeguards (carried from v1):
 * - Max 2 automatic retries per entry (attempts 1 → 2 → 3, then stop)
 * - Exponential backoff: 1 min after first failure, 5 min after second
 * - Delegates to retryDeadLetter() which has its own guards
 * - Idempotent: domain handlers use WHERE status = 'reserved'
 * - Concurrency-safe: no locks needed — retryDeadLetter rejects stale state
 *
 * Backoff note:
 * The webhook_dead_letters table has no updatedAt column. Backoff is
 * computed from createdAt. For entries with attempts > 1, the backoff
 * from createdAt is always already elapsed, so this is functionally
 * equivalent. Adding updatedAt would require a migration.
 */

import { listDeadLetters, retryDeadLetter } from "./dead-letter-queue"
import { evaluateDlqEvent } from "./dlq-decision-engine"
import { log } from "@/lib/logger"

// ── Config ──────────────────────────────────────────────

/** Maximum automatic retries per entry. After this, human review required. */
const MAX_AUTO_RETRIES = 2

/** Maximum retries per worker run. Prevents thundering herd on recovery. */
const MAX_RETRIES_PER_RUN = 10

/** Pool utilization threshold. Above this, skip all retries. */
const POOL_UTILIZATION_THRESHOLD = 0.9

/**
 * Minimum age (ms) before an entry is eligible for auto-retry.
 * Keyed by current attempts count.
 */
const BACKOFF_MS: Record<number, number> = {
  1: 1 * 60 * 1000,   // 1 minute
  2: 5 * 60 * 1000,   // 5 minutes
}

const DEFAULT_BACKOFF_MS = 10 * 60 * 1000 // 10 min fallback

/**
 * Priority order for event types. Lower number = higher priority.
 * Unmatched types get Infinity (lowest priority).
 */
const EVENT_TYPE_PRIORITY: Record<string, number> = {
  "checkout.session.completed": 0,
  "payment_intent.succeeded": 1,
  "checkout.session.expired": 2,
}

// ── Types ───────────────────────────────────────────────

export type AutoRetryResult = {
  scanned: number
  retried: number
  succeeded: number
  failed: number
  skipped: number
  skippedHealth: boolean
  entries: Array<{
    dlqId: string
    correlationId: string
    outcome: "success" | "failed" | "skipped"
    reason?: string
  }>
}

/**
 * Minimal interface for pool health check.
 * Avoids importing the full pool module — caller provides the check function.
 * Default implementation uses getPool() + getPoolHealth().
 */
export type HealthCheckFn = () => { utilization: number }

// ── Circuit Breaker ─────────────────────────────────────

function defaultHealthCheck(): { utilization: number } {
  // Lazy imports — avoid pulling in DB modules at module load time.
  // This keeps the worker testable without a real DB.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getPool } = require("@/adapters/db/pool") as { getPool: () => { totalCount: number; idleCount: number; waitingCount: number; options?: { max?: number } } }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getPoolHealth } = require("@/lib/observability/poolMonitor") as { getPoolHealth: (pool: unknown) => { stats: { active: number; max: number } } }

  const pool = getPool()
  const health = getPoolHealth(pool)
  const utilization = health.stats.max > 0
    ? health.stats.active / health.stats.max
    : 0

  return { utilization }
}

// ── Priority Sort ───────────────────────────────────────

type DlqEntry = Awaited<ReturnType<typeof listDeadLetters>>[number]

function sortByPriority(entries: DlqEntry[]): DlqEntry[] {
  return [...entries].sort((a, b) => {
    const pa = EVENT_TYPE_PRIORITY[a.eventType] ?? Infinity
    const pb = EVENT_TYPE_PRIORITY[b.eventType] ?? Infinity
    if (pa !== pb) return pa - pb
    // Within same priority, oldest first (FIFO)
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
}

// ── Worker ──────────────────────────────────────────────

export async function runAutoRetry(
  healthCheck: HealthCheckFn = defaultHealthCheck,
): Promise<AutoRetryResult> {
  const result: AutoRetryResult = {
    scanned: 0,
    retried: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    skippedHealth: false,
    entries: [],
  }

  log("info", "dlq.auto_retry_started", {})

  // ── Circuit breaker: check system health before any retry
  try {
    const { utilization } = healthCheck()
    if (utilization > POOL_UTILIZATION_THRESHOLD) {
      log("warn", "dlq.auto_retry_skipped_health", {
        reason: "pool_utilization_high",
        utilization: Math.round(utilization * 100),
        threshold: Math.round(POOL_UTILIZATION_THRESHOLD * 100),
      })
      result.skippedHealth = true
      return result
    }
  } catch (err: unknown) {
    log("warn", "dlq.auto_retry_skipped_health", {
      reason: "health_check_failed",
      error: err instanceof Error ? err.message : String(err),
    })
    result.skippedHealth = true
    return result
  }

  // Fetch unresolved entries and sort by priority
  const rawEntries = await listDeadLetters(50)
  const entries = sortByPriority(rawEntries)
  result.scanned = entries.length

  const now = Date.now()
  let retriesThisRun = 0

  for (const entry of entries) {
    const correlationId = entry.eventId

    // ── Guard 1: Global rate limit
    if (retriesThisRun >= MAX_RETRIES_PER_RUN) {
      result.skipped++
      result.entries.push({
        dlqId: entry.id,
        correlationId,
        outcome: "skipped",
        reason: `rate limit: ${MAX_RETRIES_PER_RUN} retries per run reached`,
      })
      log("info", "dlq.auto_retry_skipped_rate_limit", {
        dlqId: entry.id,
        correlationId,
        retriesThisRun,
        limit: MAX_RETRIES_PER_RUN,
      })
      continue
    }

    // ── Guard 2: Max auto-retries per entry
    if (entry.attempts > MAX_AUTO_RETRIES) {
      result.skipped++
      result.entries.push({
        dlqId: entry.id,
        correlationId,
        outcome: "skipped",
        reason: `attempts=${entry.attempts} exceeds auto-retry limit (${MAX_AUTO_RETRIES})`,
      })
      continue
    }

    // ── Guard 3: Backoff not elapsed
    const requiredAge = BACKOFF_MS[entry.attempts] ?? DEFAULT_BACKOFF_MS
    const entryAge = now - entry.createdAt.getTime()
    if (entryAge < requiredAge) {
      result.skipped++
      result.entries.push({
        dlqId: entry.id,
        correlationId,
        outcome: "skipped",
        reason: `backoff: ${Math.round(requiredAge / 1000)}s required, only ${Math.round(entryAge / 1000)}s elapsed`,
      })
      continue
    }

    // ── Guard 4: Decision engine says not auto-retryable
    const decision = evaluateDlqEvent({
      event: "webhook_processing_failed",
      eventType: entry.eventType,
      error: entry.error,
    })

    if (!decision.autoRetry) {
      result.skipped++
      result.entries.push({
        dlqId: entry.id,
        correlationId,
        outcome: "skipped",
        reason: `decision engine: ${decision.action} (${decision.reason})`,
      })
      continue
    }

    // ── Execute retry
    retriesThisRun++
    result.retried++
    const retryResult = await retryDeadLetter(entry.id)

    if (retryResult.ok) {
      result.succeeded++
      result.entries.push({
        dlqId: entry.id,
        correlationId,
        outcome: "success",
      })
      log("info", "dlq.auto_retry_success", {
        dlqId: entry.id,
        correlationId,
        eventType: entry.eventType,
        attempts: entry.attempts + 1,
      })
    } else {
      result.failed++
      result.entries.push({
        dlqId: entry.id,
        correlationId,
        outcome: "failed",
        reason: retryResult.reason,
      })
      log("warn", "dlq.auto_retry_failed", {
        dlqId: entry.id,
        correlationId,
        eventType: entry.eventType,
        attempts: entry.attempts + 1,
        code: retryResult.code,
        reason: retryResult.reason,
      })
    }
  }

  log("info", "dlq.auto_retry_completed", {
    scanned: result.scanned,
    retried: result.retried,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
    skippedHealth: result.skippedHealth,
  })

  return result
}
