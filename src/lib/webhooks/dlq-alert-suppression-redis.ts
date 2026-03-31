/**
 * DLQ Alert Suppression — Redis-backed variant
 *
 * Same suppression logic as dlq-alert-suppression.ts but stores incident
 * state in Redis instead of an in-memory Map. This makes it safe for:
 *   - Multi-instance deployments (shared state across pods)
 *   - Process restarts (state survives cold starts)
 *   - Long-running systems (Redis TTL handles cleanup)
 *
 * Key format:  dlq:incident:{eventType}::{normalizedError}
 * Value:       JSON { lastAlertedAt, lastSeverity, lastCount }
 * TTL:         24 hours (set on every write, auto-cleanup by Redis)
 *
 * Does NOT modify the in-memory suppression module.
 * Same SuppressionResult shape — drop-in replacement.
 */

import type { DlqAlert } from "./dlq-alert-engine"
import { normalizeError } from "./dlq-alert-engine"
import type { SuppressionResult } from "./dlq-alert-suppression"

// ── Config ──────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes
const SPIKE_MULTIPLIER = 2
const INCIDENT_TTL_SECONDS = 24 * 60 * 60   // 24 hours (Redis EX is in seconds)
const REDIS_PREFIX = "dlq:incident:"

// ── Types ───────────────────────────────────────────────

/** Minimal Redis interface — matches @upstash/redis and ioredis subsets. */
export type RedisClient = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>
}

type StoredRecord = {
  lastAlertedAt: number
  lastSeverity: "P1" | "P2"
  lastCount: number
}

export type RedisSuppressionOptions = {
  cooldownMs?: number
  spikeMultiplier?: number
  now?: number
}

// ── Helpers ─────────────────────────────────────────────

function incidentKey(alert: DlqAlert): string {
  return `${alert.eventType}::${normalizeError(alert.error)}`
}

function redisKey(incident: string): string {
  return `${REDIS_PREFIX}${incident}`
}

function severityRank(s: "P1" | "P2"): number {
  return s === "P1" ? 0 : 1
}

// ── Engine ──────────────────────────────────────────────

/**
 * Apply suppression logic with Redis-backed state.
 *
 * Same decision logic as the in-memory variant:
 *   1. New incident (no Redis key) → send
 *   2. Cooldown expired → send
 *   3. Inside cooldown + severity upgrade → escalate
 *   4. Inside cooldown + count spike (>= 2×) → escalate
 *   5. Inside cooldown, no escalation → suppress
 *
 * Each sent/escalated alert writes back to Redis with TTL refresh.
 * Suppressed alerts do NOT refresh TTL (cooldown continues from original).
 */
export async function applySuppressionsRedis(
  alerts: DlqAlert[],
  redis: RedisClient,
  options?: RedisSuppressionOptions,
): Promise<SuppressionResult> {
  const cooldown = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const spike = options?.spikeMultiplier ?? SPIKE_MULTIPLIER
  const now = options?.now ?? Date.now()

  const alertsToSend: DlqAlert[] = []
  const alertsSuppressed: DlqAlert[] = []
  const alertsEscalated: DlqAlert[] = []

  // updatedState is unused in the Redis variant but required by SuppressionResult.
  // Return an empty Map — callers using Redis don't need in-memory state.
  const updatedState = new Map()

  for (const alert of alerts) {
    const key = incidentKey(alert)
    const rKey = redisKey(key)

    // ── Fetch previous record from Redis
    let previous: StoredRecord | null = null
    try {
      const raw = await redis.get(rKey)
      if (raw) {
        previous = JSON.parse(raw) as StoredRecord
      }
    } catch {
      // Redis read failure → treat as new incident (fail-open)
      previous = null
    }

    // ── Decision logic (identical to in-memory variant)

    if (!previous) {
      // New incident
      alertsToSend.push(alert)
      await safeWrite(redis, rKey, { lastAlertedAt: now, lastSeverity: alert.severity, lastCount: alert.count })
      continue
    }

    const elapsed = now - previous.lastAlertedAt
    if (elapsed >= cooldown) {
      // Cooldown expired
      alertsToSend.push(alert)
      await safeWrite(redis, rKey, { lastAlertedAt: now, lastSeverity: alert.severity, lastCount: alert.count })
      continue
    }

    // Inside cooldown — check escalation
    const sevUpgrade = severityRank(alert.severity) < severityRank(previous.lastSeverity)
    const countSpike = alert.count >= previous.lastCount * spike

    if (sevUpgrade || countSpike) {
      alertsEscalated.push(alert)
      await safeWrite(redis, rKey, { lastAlertedAt: now, lastSeverity: alert.severity, lastCount: alert.count })
      continue
    }

    // No escalation → suppress (do NOT write back — cooldown continues)
    alertsSuppressed.push(alert)
  }

  return {
    alertsToSend,
    alertsSuppressed,
    alertsEscalated,
    updatedState,
  }
}

/** Write to Redis with TTL. Failures are swallowed — alert delivery
 *  must not fail because of state persistence issues. */
async function safeWrite(
  redis: RedisClient,
  key: string,
  record: StoredRecord,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(record), { EX: INCIDENT_TTL_SECONDS })
  } catch {
    // Swallow — fail-open. The next cycle will treat it as a new incident.
  }
}
