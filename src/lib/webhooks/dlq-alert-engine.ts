/**
 * DLQ Alert Generation Engine
 *
 * Takes an array of raw DLQ events, evaluates each through the decision
 * engine, groups by (eventType + normalized error), applies noise reduction,
 * and produces de-duplicated, severity-ranked alerts.
 *
 * Pure function. No I/O. No side effects. Fully deterministic.
 */

import { evaluateDlqEvent, type DlqEventInput, type Severity } from "./dlq-decision-engine"

// ── Types ───────────────────────────────────────────────

export type DlqAlertInput = DlqEventInput & {
  correlationId: string
}

export type DlqAlert = {
  severity: "P1" | "P2"
  eventType: string
  error: string
  count: number
  correlationIds: string[]
  action: string
  reason: string
  dashboardUrl: string
}

// ── Error Normalization ─────────────────────────────────

/**
 * Replaces dynamic values in error strings to create stable grouping keys.
 *
 * Strategy:
 *   1. UUIDs (hex 8-4-4-4-12)        → <id>
 *   2. Stripe IDs (cs_, evt_, pi_, …) → <id>
 *   3. Custom IDs (ord-xxx)           → <id>
 *   4. Bare numbers                   → <n>
 *   5. Lowercase + collapse whitespace
 */
export function normalizeError(error: string): string {
  return error
    // Standard UUIDs: a1b2c3d4-e5f6-7890-abcd-ef1234567890
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    // Stripe-style IDs: cs_live_abc123, evt_1abc, pi_3xyz, sub_abc
    .replace(/\b(cs|evt|pi|sub|ch|in|re|se|seti|pm|cus|price|prod|whsec|txn|payout)_[A-Za-z0-9_]+/g, "<id>")
    // Application IDs: ord-abc123, dlq-xyz
    .replace(/\b(ord|dlq|usr|evt)-[A-Za-z0-9-]+/g, "<id>")
    // Numbers (port numbers, timeouts, counts) — includes those glued to text like "30000ms"
    .replace(/\b\d+/g, "<n>")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

// ── Grouping ────────────────────────────────────────────

/** Max correlationIds stored per group. The count field tracks the true total. */
const MAX_IDS_PER_GROUP = 100

type EventGroup = {
  eventType: string
  normalizedError: string
  rawError: string
  correlationIds: string[]
  eventCount: number
  highestSeverity: Severity
  action: string
  reason: string
}

function groupKey(eventType: string, normalizedError: string): string {
  return `${eventType}::${normalizedError}`
}

function severityRank(s: Severity): number {
  if (s === "P1") return 0
  if (s === "P2") return 1
  return 2
}

// ── Engine ──────────────────────────────────────────────

/** Minimum events in a group before an alert is generated. */
const MIN_GROUP_SIZE = 3

/**
 * Generate de-duplicated alerts from an array of DLQ events.
 *
 * Returns alerts sorted by severity (P1 first), then by count descending.
 * Groups with fewer than MIN_GROUP_SIZE events are dropped (noise reduction).
 * Groups where all events are P3 are dropped (not alertable).
 */
export function generateAlerts(events: DlqAlertInput[]): DlqAlert[] {
  if (events.length === 0) return []

  // ── Step 1: Evaluate each event and build groups
  const groups = new Map<string, EventGroup>()

  for (const evt of events) {
    const decision = evaluateDlqEvent(evt)
    const eventType = evt.eventType ?? "unknown"
    const rawError = evt.error ?? "unknown"
    const normalized = normalizeError(rawError)
    const key = groupKey(eventType, normalized)

    const existing = groups.get(key)
    if (existing) {
      existing.eventCount++
      if (existing.correlationIds.length < MAX_IDS_PER_GROUP) {
        existing.correlationIds.push(evt.correlationId)
      }
      // P1 in any event promotes the entire group
      if (severityRank(decision.severity) < severityRank(existing.highestSeverity)) {
        existing.highestSeverity = decision.severity
        existing.action = decision.action
        existing.reason = decision.reason
      }
    } else {
      groups.set(key, {
        eventType,
        normalizedError: normalized,
        rawError,
        correlationIds: [evt.correlationId],
        eventCount: 1,
        highestSeverity: decision.severity,
        action: decision.action,
        reason: decision.reason,
      })
    }
  }

  // ── Step 2: Filter — noise reduction
  const alerts: DlqAlert[] = []

  for (const group of groups.values()) {
    // Drop small groups (noise)
    if (group.eventCount < MIN_GROUP_SIZE) continue

    // Drop P3 groups (not alertable)
    if (group.highestSeverity === "P3") continue

    alerts.push({
      severity: group.highestSeverity as "P1" | "P2",
      eventType: group.eventType,
      error: group.rawError,
      count: group.eventCount,
      correlationIds: group.correlationIds,
      action: group.action,
      reason: group.reason,
      dashboardUrl: "/dashboard/dead-letters",
    })
  }

  // ── Step 3: Sort — P1 first, then by count descending
  alerts.sort((a, b) => {
    const sevDiff = severityRank(a.severity as Severity) - severityRank(b.severity as Severity)
    if (sevDiff !== 0) return sevDiff
    return b.count - a.count
  })

  return alerts
}
