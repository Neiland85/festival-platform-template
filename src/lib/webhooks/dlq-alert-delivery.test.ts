import { describe, it, expect } from "vitest"
import {
  toSlackPayload,
  toPagerDutyPayload,
  toPlainText,
  buildDeliveryBatch,
  type SlackPayload,
  type PagerDutyPayload,
} from "./dlq-alert-delivery"
import type { DlqAlert } from "./dlq-alert-engine"

// ── Helpers ─────────────────────────────────────────────

function makeAlert(overrides: Partial<DlqAlert> = {}): DlqAlert {
  return {
    severity: "P1",
    eventType: "checkout.session.completed",
    error: "connection refused",
    count: 5,
    correlationIds: ["evt_aaa", "evt_bbb", "evt_ccc", "evt_ddd", "evt_eee"],
    action: "retry",
    reason: "Transient failure: Database connection refused",
    dashboardUrl: "/dashboard/dead-letters",
    ...overrides,
  }
}

// ── Slack adapter ───────────────────────────────────────

describe("toSlackPayload", () => {
  it("produces valid Slack Block Kit structure", () => {
    const payload = toSlackPayload(makeAlert())
    expect(payload.channel).toBe("#ops-alerts")
    expect(payload.blocks).toHaveLength(4) // header + section + context + divider
    expect(payload.blocks[0]!.type).toBe("header")
    expect(payload.blocks[1]!.type).toBe("section")
    expect(payload.blocks[2]!.type).toBe("context")
    expect(payload.blocks[3]!.type).toBe("divider")
  })

  it("includes severity and eventType in header", () => {
    const payload = toSlackPayload(makeAlert())
    const header = payload.blocks[0] as { type: "header"; text: { text: string } }
    expect(header.text.text).toContain("P1")
    expect(header.text.text).toContain("checkout.session.completed")
  })

  it("includes count, error, action, reason, dashboard in section", () => {
    const payload = toSlackPayload(makeAlert())
    const section = payload.blocks[1] as { type: "section"; text: { text: string } }
    const text = section.text.text
    expect(text).toContain("5 events")
    expect(text).toContain("connection refused")
    expect(text).toContain("retry")
    expect(text).toContain("Transient failure")
    expect(text).toContain("/dashboard/dead-letters")
  })

  it("includes correlationIds in context block", () => {
    const payload = toSlackPayload(makeAlert())
    const context = payload.blocks[2] as { type: "context"; elements: Array<{ text: string }> }
    expect(context.elements[0]!.text).toContain("evt_aaa")
    expect(context.elements[0]!.text).toContain("evt_eee")
  })

  it("respects custom channel", () => {
    const payload = toSlackPayload(makeAlert(), "#custom-channel")
    expect(payload.channel).toBe("#custom-channel")
  })

  it("truncates long correlationId lists", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `evt_${i.toString().padStart(3, "0")}`)
    const payload = toSlackPayload(makeAlert({ correlationIds: ids }))
    const context = payload.blocks[2] as { type: "context"; elements: Array<{ text: string }> }
    const text = context.elements[0]!.text
    expect(text).toContain("evt_000")
    expect(text).toContain("evt_004")
    expect(text).not.toContain("evt_005")
    expect(text).toContain("… and 15 more")
  })
})

// ── PagerDuty adapter ───────────────────────────────────

describe("toPagerDutyPayload", () => {
  it("produces valid PD Events API v2 structure", () => {
    const payload = toPagerDutyPayload(makeAlert())
    expect(payload.event_action).toBe("trigger")
    expect(payload.routing_key).toBeDefined()
    expect(payload.dedup_key).toBeDefined()
    expect(payload.payload.summary).toBeDefined()
    expect(payload.payload.severity).toBeDefined()
    expect(payload.payload.source).toBe("dlq-alert-engine")
    expect(payload.payload.component).toBe("webhook-dlq")
  })

  it("uses critical severity for P1", () => {
    const payload = toPagerDutyPayload(makeAlert({ severity: "P1" }))
    expect(payload.payload.severity).toBe("critical")
  })

  it("uses error severity for P2", () => {
    const payload = toPagerDutyPayload(makeAlert({ severity: "P2" }))
    expect(payload.payload.severity).toBe("error")
  })

  it("generates stable dedup_key from eventType + normalized error", () => {
    const a = toPagerDutyPayload(makeAlert({ error: "Order not found: ord-abc123" }))
    const b = toPagerDutyPayload(makeAlert({ error: "Order not found: ord-xyz789" }))
    // Same normalized error → same dedup_key
    expect(a.dedup_key).toBe(b.dedup_key)
  })

  it("generates different dedup_key for different errors", () => {
    const a = toPagerDutyPayload(makeAlert({ error: "connection refused" }))
    const b = toPagerDutyPayload(makeAlert({ error: "statement timeout" }))
    expect(a.dedup_key).not.toBe(b.dedup_key)
  })

  it("includes full alert data in custom_details", () => {
    const payload = toPagerDutyPayload(makeAlert())
    const details = payload.payload.custom_details
    expect(details.eventType).toBe("checkout.session.completed")
    expect(details.count).toBe(5)
    expect(details.action).toBe("retry")
    expect(details.dashboardUrl).toBe("/dashboard/dead-letters")
  })

  it("truncates correlationIds in custom_details", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `evt_${i}`)
    const payload = toPagerDutyPayload(makeAlert({ correlationIds: ids }))
    const details = payload.payload.custom_details
    expect(details.correlationIds).toHaveLength(6) // 5 + "… and 15 more"
    expect(details.correlationIds[5]).toContain("… and 15 more")
  })

  it("respects custom routing key", () => {
    const payload = toPagerDutyPayload(makeAlert(), "my-pd-key")
    expect(payload.routing_key).toBe("my-pd-key")
  })

  it("summary includes severity, count, eventType, error", () => {
    const payload = toPagerDutyPayload(makeAlert())
    expect(payload.payload.summary).toContain("[P1]")
    expect(payload.payload.summary).toContain("5x")
    expect(payload.payload.summary).toContain("checkout.session.completed")
    expect(payload.payload.summary).toContain("connection refused")
  })
})

// ── Plain text adapter ──────────────────────────────────

describe("toPlainText", () => {
  it("produces subject and body", () => {
    const payload = toPlainText(makeAlert())
    expect(payload.subject).toContain("[P1]")
    expect(payload.subject).toContain("5x")
    expect(payload.body).toContain("Severity:")
    expect(payload.body).toContain("Event Type:")
    expect(payload.body).toContain("Correlation IDs:")
  })

  it("includes all required fields in body", () => {
    const payload = toPlainText(makeAlert())
    expect(payload.body).toContain("connection refused")
    expect(payload.body).toContain("retry")
    expect(payload.body).toContain("Transient failure")
    expect(payload.body).toContain("/dashboard/dead-letters")
    expect(payload.body).toContain("evt_aaa")
  })

  it("truncates long correlationId lists", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `evt_${i}`)
    const payload = toPlainText(makeAlert({ correlationIds: ids }))
    expect(payload.body).toContain("evt_0")
    expect(payload.body).toContain("evt_4")
    expect(payload.body).not.toContain("  - evt_5")
    expect(payload.body).toContain("… and 5 more")
  })
})

// ── Batch router ────────────────────────────────────────

describe("buildDeliveryBatch", () => {
  it("P1 alert generates Slack + PagerDuty + plain text", () => {
    const batch = buildDeliveryBatch([makeAlert({ severity: "P1" })])
    expect(batch.slack).toHaveLength(1)
    expect(batch.pagerduty).toHaveLength(1)
    expect(batch.plaintext).toHaveLength(1)
  })

  it("P2 alert generates Slack + plain text only (no PagerDuty)", () => {
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])
    expect(batch.slack).toHaveLength(1)
    expect(batch.pagerduty).toHaveLength(0)
    expect(batch.plaintext).toHaveLength(1)
  })

  it("mixed P1 + P2 routes correctly", () => {
    const alerts = [
      makeAlert({ severity: "P1", eventType: "checkout.session.completed" }),
      makeAlert({ severity: "P2", eventType: "checkout.session.expired" }),
      makeAlert({ severity: "P2", eventType: "payment_intent.succeeded" }),
    ]
    const batch = buildDeliveryBatch(alerts)
    expect(batch.slack).toHaveLength(3)
    expect(batch.pagerduty).toHaveLength(1) // only P1
    expect(batch.plaintext).toHaveLength(3)
  })

  it("passes custom channel and routing key", () => {
    const batch = buildDeliveryBatch(
      [makeAlert({ severity: "P1" })],
      { slackChannel: "#custom", pdRoutingKey: "my-key" },
    )
    expect(batch.slack[0]!.channel).toBe("#custom")
    expect(batch.pagerduty[0]!.routing_key).toBe("my-key")
  })

  it("returns empty batch for empty input", () => {
    const batch = buildDeliveryBatch([])
    expect(batch.slack).toHaveLength(0)
    expect(batch.pagerduty).toHaveLength(0)
    expect(batch.plaintext).toHaveLength(0)
  })

  it("Slack and PagerDuty payloads are stable (same alert → same structure)", () => {
    const alert = makeAlert()
    const batch1 = buildDeliveryBatch([alert])
    const batch2 = buildDeliveryBatch([alert])

    // Structural equality (deterministic)
    expect(JSON.stringify(batch1.slack[0])).toBe(JSON.stringify(batch2.slack[0]))
    expect(JSON.stringify(batch1.pagerduty[0])).toBe(JSON.stringify(batch2.pagerduty[0]))
    expect(JSON.stringify(batch1.plaintext[0])).toBe(JSON.stringify(batch2.plaintext[0]))
  })
})
