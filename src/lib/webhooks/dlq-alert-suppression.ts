/**
 * DLQ Alert Suppression / Cooldown
 *
 * Reduces alert fatigue by tracking incident state and suppressing
 * duplicate alerts within a cooldown window. Suppression is broken
 * when the situation materially worsens (severity upgrade or count spike).
 *
 * Pure logic — no I/O. State is passed in and returned out.
 * The caller is responsible for persisting state between cycles.
 *
 * Sits between generateAlerts() and buildDeliveryBatch():
 *   generateAlerts() → applySuppressions() → buildDeliveryBatch()
 */

import type { DlqAlert } from "./dlq-alert-engine"
import { normalizeError } from "./dlq-alert-engine"

// ── Config ──────────────────────────────────────────────

/** Default cooldown in milliseconds. Alerts for the same incident within this
 *  window are suppressed unless escalation criteria are met. */
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

/** If current count >= lastCount * SPIKE_MULTIPLIER, suppression is broken. */
const SPIKE_MULTIPLIER = 2

// ── Types ───────────────────────────────────────────────

/** State for a single tracked incident. */
export type IncidentRecord = {
  /** Stable key: eventType + "::" + normalizedError */
  key: string
  /** Timestamp (ms) when last alert was sent for this incident */
  lastAlertedAt: number
  /** Severity of the last sent alert */
  lastSeverity: "P1" | "P2"
  /** Event count in the last sent alert */
  lastCount: number
}

/** In-memory map of incidentKey → IncidentRecord. */
export type IncidentState = Map<string, IncidentRecord>

export type SuppressionResult = {
  /** Alerts that should be delivered. */
  alertsToSend: DlqAlert[]
  /** Alerts that were suppressed (inside cooldown, no escalation). */
  alertsSuppressed: DlqAlert[]
  /** Alerts that broke suppression due to worsening conditions. */
  alertsEscalated: DlqAlert[]
  /** Updated incident state — caller must persist for next cycle. */
  updatedState: IncidentState
}

export type SuppressionOptions = {
  /** Override cooldown for testing. Default: 10 minutes. */
  cooldownMs?: number
  /** Override spike multiplier for testing. Default: 2. */
  spikeMultiplier?: number
  /** Override "now" for testing. Default: Date.now(). */
  now?: number
}

// ── Helpers ─────────────────────────────────────────────

function incidentKey(alert: DlqAlert): string {
  return `${alert.eventType}::${normalizeError(alert.error)}`
}

function severityRank(s: "P1" | "P2"): number {
  return s === "P1" ? 0 : 1
}

function isSeverityUpgrade(current: "P1" | "P2", previous: "P1" | "P2"): boolean {
  return severityRank(current) < severityRank(previous)
}

function isCountSpike(currentCount: number, lastCount: number, multiplier: number): boolean {
  return currentCount >= lastCount * multiplier
}

// ── Engine ──────────────────────────────────────────────

/**
 * Apply suppression logic to a batch of alerts.
 *
 * For each alert:
 *   1. Compute incident key (eventType + normalized error)
 *   2. Look up previous incident state
 *   3. If no previous record → send (new incident)
 *   4. If cooldown expired → send (stale incident refreshed)
 *   5. If inside cooldown → check escalation:
 *      a. Severity upgrade (P2 → P1) → send as escalation
 *      b. Count spike (current >= 2× last) → send as escalation
 *      c. Neither → suppress
 *   6. Update incident state for sent alerts
 *
 * Returns the suppression result with all three categories.
 */
export function applySuppressions(
  alerts: DlqAlert[],
  currentState: IncidentState,
  options?: SuppressionOptions,
): SuppressionResult {
  const cooldown = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const spike = options?.spikeMultiplier ?? SPIKE_MULTIPLIER
  const now = options?.now ?? Date.now()

  // Clone state so we don't mutate the input
  const updatedState: IncidentState = new Map(currentState)

  const alertsToSend: DlqAlert[] = []
  const alertsSuppressed: DlqAlert[] = []
  const alertsEscalated: DlqAlert[] = []

  for (const alert of alerts) {
    const key = incidentKey(alert)
    const previous = updatedState.get(key)

    // ── New incident: never seen before
    if (!previous) {
      alertsToSend.push(alert)
      updatedState.set(key, {
        key,
        lastAlertedAt: now,
        lastSeverity: alert.severity,
        lastCount: alert.count,
      })
      continue
    }

    // ── Cooldown expired: treat as fresh
    const elapsed = now - previous.lastAlertedAt
    if (elapsed >= cooldown) {
      alertsToSend.push(alert)
      updatedState.set(key, {
        key,
        lastAlertedAt: now,
        lastSeverity: alert.severity,
        lastCount: alert.count,
      })
      continue
    }

    // ── Inside cooldown: check escalation conditions
    const sevUpgrade = isSeverityUpgrade(alert.severity, previous.lastSeverity)
    const countSpike = isCountSpike(alert.count, previous.lastCount, spike)

    if (sevUpgrade || countSpike) {
      alertsEscalated.push(alert)
      updatedState.set(key, {
        key,
        lastAlertedAt: now,
        lastSeverity: alert.severity,
        lastCount: alert.count,
      })
      continue
    }

    // ── No escalation: suppress
    alertsSuppressed.push(alert)
    // Do NOT update lastAlertedAt — cooldown timer continues from original alert
  }

  return {
    alertsToSend,
    alertsSuppressed,
    alertsEscalated,
    updatedState,
  }
}

/**
 * Create a fresh (empty) incident state.
 */
export function createIncidentState(): IncidentState {
  return new Map()
}
