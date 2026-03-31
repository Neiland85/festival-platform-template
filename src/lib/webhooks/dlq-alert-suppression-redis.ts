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

/** Minimal Redis interface — matches @upstash/redis and ioredis subsets.
 *  set() returns "OK" on success, null when NX prevents the write. */
export type RedisClient = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null>
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
 * Atomicity strategy (no Lua scripts):
 *   1. SET key value NX EX ttl  — atomic claim for new incidents.
 *      If returns "OK": this instance wins → send.
 *      If returns null: key already exists → another instance claimed it, or
 *      it's an existing incident. Fall through to GET for escalation check.
 *   2. GET key — read existing state for cooldown / escalation logic.
 *   3. SET key value EX ttl (no NX) — unconditional overwrite on escalation
 *      or cooldown expiry. Last-writer-wins is acceptable here because
 *      escalations are rare and idempotent at the delivery layer
 *      (PagerDuty dedup_key, Slack in-run dedup).
 *
 * This eliminates the GET-then-SET race where two instances both read null
 * and both send the same new-incident alert.
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
    const record: StoredRecord = { lastAlertedAt: now, lastSeverity: alert.severity, lastCount: alert.count }

    // ── Step 1: Atomic claim for new incidents (SET NX)
    // If the key doesn't exist, this SET creates it atomically.
    // Only one instance wins — the rest see null and fall through to GET.
    let claimed = false
    try {
      const result = await redis.set(rKey, JSON.stringify(record), { EX: INCIDENT_TTL_SECONDS, NX: true })
      claimed = result === "OK"
    } catch {
      // Redis failure → fall through to GET path (fail-open)
    }

    if (claimed) {
      // This instance won the race — send as new incident
      alertsToSend.push(alert)
      continue
    }

    // ── Step 2: Key exists — read current state for escalation check
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

    if (!previous) {
      // Key existed for SET NX but GET returned null (TTL race or parse error).
      // Fail-open: send the alert.
      alertsToSend.push(alert)
      await safeWrite(redis, rKey, record)
      continue
    }

    // ── Step 3: Cooldown expired → send (unconditional overwrite)
    const elapsed = now - previous.lastAlertedAt
    if (elapsed >= cooldown) {
      alertsToSend.push(alert)
      await safeWrite(redis, rKey, record)
      continue
    }

    // ── Step 4: Inside cooldown — check escalation
    const sevUpgrade = severityRank(alert.severity) < severityRank(previous.lastSeverity)
    const countSpike = alert.count >= previous.lastCount * spike

    if (sevUpgrade || countSpike) {
      alertsEscalated.push(alert)
      await safeWrite(redis, rKey, record)
      continue
    }

    // ── Step 5: No escalation → suppress
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
