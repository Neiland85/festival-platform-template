import { describe, it, expect } from "vitest"
import {
  applySuppressions,
  createIncidentState,
  type IncidentState,
} from "./dlq-alert-suppression"
import type { DlqAlert } from "./dlq-alert-engine"

// ── Helpers ─────────────────────────────────────────────

function makeAlert(overrides: Partial<DlqAlert> = {}): DlqAlert {
  return {
    severity: "P2",
    eventType: "checkout.session.completed",
    error: "connection refused",
    count: 5,
    correlationIds: ["evt_1", "evt_2", "evt_3", "evt_4", "evt_5"],
    action: "retry",
    reason: "Transient failure",
    dashboardUrl: "/dashboard/dead-letters",
    ...overrides,
  }
}

const NOW = 1_000_000_000_000 // fixed timestamp for deterministic tests
const COOLDOWN = 10 * 60 * 1000 // 10 min

// ── New incidents ───────────────────────────────────────

describe("applySuppressions", () => {
  it("sends new incidents (no prior state)", () => {
    const result = applySuppressions(
      [makeAlert()],
      createIncidentState(),
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(1)
    expect(result.alertsSuppressed).toHaveLength(0)
    expect(result.alertsEscalated).toHaveLength(0)
  })

  it("records incident state after sending", () => {
    const result = applySuppressions(
      [makeAlert({ severity: "P2", count: 5 })],
      createIncidentState(),
      { now: NOW },
    )

    const key = "checkout.session.completed::connection refused"
    const record = result.updatedState.get(key)
    expect(record).toBeDefined()
    expect(record!.lastAlertedAt).toBe(NOW)
    expect(record!.lastSeverity).toBe("P2")
    expect(record!.lastCount).toBe(5)
  })

  // ── Suppression inside cooldown ─────────────────────

  it("suppresses duplicate alert inside cooldown", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 5 * 60 * 1000, // 5 min ago
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P2", count: 5 })],
      state,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(0)
    expect(result.alertsSuppressed).toHaveLength(1)
    expect(result.alertsEscalated).toHaveLength(0)
  })

  it("does NOT update lastAlertedAt on suppression", () => {
    const originalTime = NOW - 5 * 60 * 1000
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: originalTime,
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P2", count: 5 })],
      state,
      { now: NOW },
    )

    const record = result.updatedState.get("checkout.session.completed::connection refused")
    expect(record!.lastAlertedAt).toBe(originalTime) // unchanged
  })

  // ── Cooldown expired ────────────────────────────────

  it("sends alert after cooldown expires", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - COOLDOWN - 1, // just past cooldown
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P2", count: 5 })],
      state,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(1)
    expect(result.alertsSuppressed).toHaveLength(0)
  })

  // ── Severity upgrade breaks suppression ─────────────

  it("escalates when severity upgrades P2 → P1", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 2 * 60 * 1000, // 2 min ago, inside cooldown
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P1", count: 5 })],
      state,
      { now: NOW },
    )

    expect(result.alertsToSend).toHaveLength(0)
    expect(result.alertsSuppressed).toHaveLength(0)
    expect(result.alertsEscalated).toHaveLength(1)
  })

  it("updates state on escalation", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 2 * 60 * 1000,
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P1", count: 5 })],
      state,
      { now: NOW },
    )

    const record = result.updatedState.get("checkout.session.completed::connection refused")
    expect(record!.lastSeverity).toBe("P1")
    expect(record!.lastAlertedAt).toBe(NOW) // refreshed
  })

  // ── Count spike breaks suppression ──────────────────

  it("escalates when count spikes (>= 2x)", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 3 * 60 * 1000,
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P2", count: 10 })], // 10 >= 5*2
      state,
      { now: NOW },
    )

    expect(result.alertsEscalated).toHaveLength(1)
    expect(result.alertsSuppressed).toHaveLength(0)
  })

  it("suppresses when count increases but below spike threshold", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 3 * 60 * 1000,
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [makeAlert({ severity: "P2", count: 7 })], // 7 < 5*2
      state,
      { now: NOW },
    )

    expect(result.alertsSuppressed).toHaveLength(1)
    expect(result.alertsEscalated).toHaveLength(0)
  })

  // ── Different errors = separate incidents ───────────

  it("treats different normalized errors as separate incidents", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 1 * 60 * 1000, // 1 min ago, inside cooldown
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions(
      [
        makeAlert({ error: "connection refused", count: 5 }), // same → suppressed
        makeAlert({ error: "statement timeout", count: 3 }),   // different → sent
      ],
      state,
      { now: NOW },
    )

    expect(result.alertsSuppressed).toHaveLength(1)
    expect(result.alertsToSend).toHaveLength(1)
    expect(result.alertsToSend[0]!.error).toBe("statement timeout")
  })

  // ── Multiple alerts in single batch ─────────────────

  it("handles mixed batch: new + suppressed + escalated", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 2 * 60 * 1000,
        lastSeverity: "P2",
        lastCount: 5,
      }],
      ["checkout.session.completed::statement timeout", {
        key: "checkout.session.completed::statement timeout",
        lastAlertedAt: NOW - 3 * 60 * 1000,
        lastSeverity: "P2",
        lastCount: 3,
      }],
    ])

    const result = applySuppressions(
      [
        makeAlert({ error: "connection refused", severity: "P2", count: 5 }),  // same → suppressed
        makeAlert({ error: "statement timeout", severity: "P1", count: 3 }),   // sev upgrade → escalated
        makeAlert({ error: "new weird error", severity: "P2", count: 4 }),     // new → sent
      ],
      state,
      { now: NOW },
    )

    expect(result.alertsSuppressed).toHaveLength(1)
    expect(result.alertsEscalated).toHaveLength(1)
    expect(result.alertsToSend).toHaveLength(1)
  })

  // ── Empty input ─────────────────────────────────────

  it("returns empty results for empty input", () => {
    const result = applySuppressions([], createIncidentState(), { now: NOW })
    expect(result.alertsToSend).toHaveLength(0)
    expect(result.alertsSuppressed).toHaveLength(0)
    expect(result.alertsEscalated).toHaveLength(0)
  })

  // ── Does not mutate input state ─────────────────────

  it("does not mutate the input state map", () => {
    const state = createIncidentState()
    const sizeBefore = state.size

    applySuppressions([makeAlert()], state, { now: NOW })

    expect(state.size).toBe(sizeBefore) // unchanged
  })

  // ── Custom cooldown ─────────────────────────────────

  it("respects custom cooldown duration", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 30_000, // 30s ago
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    // 1 minute cooldown → 30s is inside
    const suppressed = applySuppressions(
      [makeAlert()], state, { now: NOW, cooldownMs: 60_000 },
    )
    expect(suppressed.alertsSuppressed).toHaveLength(1)

    // 20s cooldown → 30s is past
    const sent = applySuppressions(
      [makeAlert()], state, { now: NOW, cooldownMs: 20_000 },
    )
    expect(sent.alertsToSend).toHaveLength(1)
  })

  // ── TTL cleanup ───────────────────────────────────

  it("prunes incidents older than TTL", () => {
    const TTL = 24 * 60 * 60 * 1000 // 24h
    const state: IncidentState = new Map([
      ["old::stale error", {
        key: "old::stale error",
        lastAlertedAt: NOW - TTL - 1, // just past TTL
        lastSeverity: "P2",
        lastCount: 3,
      }],
      ["recent::fresh error", {
        key: "recent::fresh error",
        lastAlertedAt: NOW - 60_000, // 1 min ago
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions([], state, { now: NOW })

    // Old incident pruned, recent kept
    expect(result.updatedState.has("old::stale error")).toBe(false)
    expect(result.updatedState.has("recent::fresh error")).toBe(true)
  })

  it("keeps incidents inside TTL", () => {
    const TTL = 24 * 60 * 60 * 1000
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - TTL + 60_000, // 1 min before TTL expires
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    const result = applySuppressions([], state, { now: NOW })

    expect(result.updatedState.size).toBe(1)
  })

  it("cleanup runs automatically on every call", () => {
    const state: IncidentState = new Map([
      ["a::error a", { key: "a::error a", lastAlertedAt: 0, lastSeverity: "P2", lastCount: 1 }],
      ["b::error b", { key: "b::error b", lastAlertedAt: 0, lastSeverity: "P2", lastCount: 1 }],
      ["c::error c", { key: "c::error c", lastAlertedAt: 0, lastSeverity: "P2", lastCount: 1 }],
    ])

    // All 3 are ancient (lastAlertedAt=0) relative to NOW
    const result = applySuppressions([], state, { now: NOW })

    expect(result.updatedState.size).toBe(0)
  })

  it("respects custom TTL", () => {
    const state: IncidentState = new Map([
      ["checkout.session.completed::connection refused", {
        key: "checkout.session.completed::connection refused",
        lastAlertedAt: NOW - 120_000, // 2 min ago
        lastSeverity: "P2",
        lastCount: 5,
      }],
    ])

    // 1 min TTL → 2 min old is pruned
    const pruned = applySuppressions([], state, { now: NOW, ttlMs: 60_000 })
    expect(pruned.updatedState.size).toBe(0)

    // 5 min TTL → 2 min old is kept
    const kept = applySuppressions([], state, { now: NOW, ttlMs: 300_000 })
    expect(kept.updatedState.size).toBe(1)
  })

  it("does not mutate input state during cleanup", () => {
    const state: IncidentState = new Map([
      ["old::gone", { key: "old::gone", lastAlertedAt: 0, lastSeverity: "P2", lastCount: 1 }],
    ])

    applySuppressions([], state, { now: NOW })

    expect(state.size).toBe(1) // input unchanged
  })
})
