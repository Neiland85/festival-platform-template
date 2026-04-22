import { describe, it, expect } from "vitest"
import { generateAlerts, normalizeError, type DlqAlertInput } from "./dlq-alert-engine"

// ── Helpers ─────────────────────────────────────────────

function makeEvent(overrides: Partial<DlqAlertInput> = {}): DlqAlertInput {
  return {
    event: "webhook_processing_failed",
    eventType: "checkout.session.completed",
    error: "connection refused",
    correlationId: `evt_${Math.random().toString(36).slice(2, 10)}`,
    ...overrides,
  }
}

function makeN(n: number, overrides: Partial<DlqAlertInput> = {}): DlqAlertInput[] {
  return Array.from({ length: n }, () => makeEvent(overrides))
}

// ── normalizeError ──────────────────────────────────────

describe("normalizeError", () => {
  it("replaces UUIDs", () => {
    expect(normalizeError("Order a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found"))
      .toBe("order <id> not found")
  })

  it("replaces Stripe IDs", () => {
    expect(normalizeError("Session cs_live_abc123XYZ failed"))
      .toBe("session <id> failed")
  })

  it("replaces application IDs", () => {
    expect(normalizeError("Order not found: ord-a1b2c3"))
      .toBe("order not found: <id>")
  })

  it("replaces numbers", () => {
    expect(normalizeError("Connection timeout after 30000ms on port 5432"))
      .toBe("connection timeout after <n>ms on port <n>")
  })

  it("collapses whitespace and lowercases", () => {
    expect(normalizeError("  Multiple   Spaces   Here  "))
      .toBe("multiple spaces here")
  })

  it("handles combined patterns", () => {
    expect(normalizeError("Order ord-xyz-123 failed after 5000ms: cs_test_abc"))
      .toBe("order <id> failed after <n>ms: <id>")
  })
})

// ── generateAlerts ──────────────────────────────────────

describe("generateAlerts", () => {
  it("returns empty array for empty input", () => {
    expect(generateAlerts([])).toEqual([])
  })

  // ── Noise reduction: < 3 events → no alert
  it("produces no alert for a single event", () => {
    const alerts = generateAlerts([makeEvent()])
    expect(alerts).toHaveLength(0)
  })

  it("produces no alert for 2 identical events", () => {
    const alerts = generateAlerts(makeN(2))
    expect(alerts).toHaveLength(0)
  })

  // ── Threshold: exactly 3 → alert
  it("produces 1 alert for 3 identical errors", () => {
    const alerts = generateAlerts(makeN(3))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.count).toBe(3)
    expect(alerts[0]!.eventType).toBe("checkout.session.completed")
    expect(alerts[0]!.correlationIds).toHaveLength(3)
    expect(alerts[0]!.dashboardUrl).toBe("/dashboard/dead-letters")
  })

  // ── Grouping: different errors → separate alerts
  it("produces separate alerts for different error patterns", () => {
    const events = [
      ...makeN(3, { error: "connection refused" }),
      ...makeN(3, { error: "statement timeout" }),
    ]
    const alerts = generateAlerts(events)
    expect(alerts).toHaveLength(2)
  })

  // ── Grouping: different eventTypes → separate alerts
  it("separates groups by eventType", () => {
    const events = [
      ...makeN(3, { eventType: "checkout.session.completed", error: "unknown domain error" }),
      ...makeN(3, { eventType: "payment_intent.succeeded", error: "unknown domain error" }),
    ]
    const alerts = generateAlerts(events)
    expect(alerts).toHaveLength(2)
  })

  // ── Normalization: dynamic IDs collapse into same group
  it("groups errors with different IDs into same alert", () => {
    const events = [
      makeEvent({ error: "Order not found: ord-abc123" }),
      makeEvent({ error: "Order not found: ord-def456" }),
      makeEvent({ error: "Order not found: ord-ghi789" }),
    ]
    const alerts = generateAlerts(events)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.count).toBe(3)
  })

  // ── Severity: P1 override
  it("P1 in any event promotes the entire group to P1", () => {
    // checkout.session.completed + non-transient error → P1 (investigate)
    const alerts = generateAlerts(makeN(3, {
      eventType: "checkout.session.completed",
      error: "unexpected null pointer in domain handler",
    }))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.severity).toBe("P1")
  })

  // ── Severity: P2 for non-revenue
  it("non-revenue event type produces P2", () => {
    const alerts = generateAlerts(makeN(3, {
      eventType: "checkout.session.expired",
      error: "unexpected error in cancel handler",
    }))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.severity).toBe("P2")
  })

  // ── P3 groups are dropped
  it("drops P3 groups (safe errors)", () => {
    const alerts = generateAlerts(makeN(5, {
      error: "Order status is not reserved",
    }))
    expect(alerts).toHaveLength(0)
  })

  // ── Sort: P1 before P2
  it("sorts P1 alerts before P2 alerts", () => {
    const events = [
      ...makeN(3, {
        eventType: "checkout.session.completed",
        error: "unknown domain error",
      }),
      ...makeN(5, {
        eventType: "checkout.session.expired",
        error: "unknown cancel error",
      }),
    ]
    const alerts = generateAlerts(events)
    expect(alerts).toHaveLength(2)
    expect(alerts[0]!.severity).toBe("P1")
    expect(alerts[1]!.severity).toBe("P2")
  })

  // ── Sort: within same severity, higher count first
  it("within same severity, sorts by count descending", () => {
    const events = [
      ...makeN(3, {
        eventType: "checkout.session.expired",
        error: "error alpha",
      }),
      ...makeN(7, {
        eventType: "checkout.session.expired",
        error: "error beta",
      }),
    ]
    const alerts = generateAlerts(events)
    expect(alerts).toHaveLength(2)
    expect(alerts[0]!.count).toBe(7)
    expect(alerts[1]!.count).toBe(3)
  })

  // ── Mixed: some groups below threshold, some above
  it("only alerts on groups meeting threshold", () => {
    const events = [
      ...makeN(3, { error: "connection refused" }),
      ...makeN(1, { error: "rare one-off error" }),
      ...makeN(2, { error: "just below threshold" }),
    ]
    const alerts = generateAlerts(events)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.error).toBe("connection refused")
  })

  // ── correlationIds are preserved
  it("preserves all correlationIds in the group", () => {
    const ids = ["evt_aaa", "evt_bbb", "evt_ccc"]
    const events = ids.map((id) => makeEvent({ correlationId: id, error: "connection refused" }))
    const alerts = generateAlerts(events)
    expect(alerts[0]!.correlationIds).toEqual(expect.arrayContaining(ids))
  })

  // ── action and reason from decision engine
  it("carries action and reason from the decision engine", () => {
    const alerts = generateAlerts(makeN(3, { error: "connection refused" }))
    expect(alerts[0]!.action).toBe("retry")
    expect(alerts[0]!.reason).toContain("Transient failure")
  })
})
