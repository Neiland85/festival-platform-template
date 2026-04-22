import { describe, it, expect } from "vitest"
import { evaluateDlqEvent } from "./dlq-decision-engine"

describe("evaluateDlqEvent", () => {
  // ── DLQ persist failure (always P1) ─────────────
  describe("dlq_persist_failed", () => {
    it("returns P1 + escalate regardless of eventType", () => {
      const result = evaluateDlqEvent({ event: "dlq_persist_failed" })
      expect(result.severity).toBe("P1")
      expect(result.action).toBe("escalate")
      expect(result.autoRetry).toBe(false)
    })
  })

  // ── Safe errors ─────────────────────────────────
  describe("safe errors", () => {
    it("resolves 'status is not reserved' as P3", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "checkout.session.completed",
        error: "Order status is not reserved",
      })
      expect(result.severity).toBe("P3")
      expect(result.action).toBe("resolve")
      expect(result.autoRetry).toBe(false)
      expect(result.reason).toContain("Safe error")
    })

    it("resolves 'already completed'", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        error: "Order already completed",
      })
      expect(result.severity).toBe("P3")
      expect(result.action).toBe("resolve")
    })

    it("resolves 'Duplicate idempotency key'", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        error: "Duplicate idempotency key: idk_abc123",
      })
      expect(result.action).toBe("resolve")
      expect(result.autoRetry).toBe(false)
    })

    // Safe errors override revenue event severity
    it("does NOT upgrade to P1 for checkout.session.completed with safe error", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "checkout.session.completed",
        error: "Order already completed",
      })
      expect(result.severity).toBe("P3")
    })
  })

  // ── Transient errors ────────────────────────────
  describe("transient errors", () => {
    it("auto-retry on connection refused", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "checkout.session.expired",
        error: "connect ECONNREFUSED 127.0.0.1:5432",
      })
      expect(result.action).toBe("retry")
      expect(result.autoRetry).toBe(true)
      expect(result.severity).toBe("P3") // expired = non-revenue
    })

    it("upgrades to P2 for revenue event with transient error", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "checkout.session.completed",
        error: "connection timeout after 30000ms",
      })
      expect(result.action).toBe("retry")
      expect(result.autoRetry).toBe(true)
      expect(result.severity).toBe("P2")
    })

    it("auto-retry on pool exhaustion", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        error: "too many connections for role",
      })
      expect(result.autoRetry).toBe(true)
    })

    it("auto-retry on ETIMEDOUT", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        error: "connect ETIMEDOUT 10.0.0.1:5432",
      })
      expect(result.autoRetry).toBe(true)
    })
  })

  // ── Revenue-impacting webhook failure ───────────
  describe("checkout.session.completed failure", () => {
    it("returns P1 for non-safe, non-transient error", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "checkout.session.completed",
        error: "Cannot read properties of undefined (reading 'id')",
      })
      expect(result.severity).toBe("P1")
      expect(result.action).toBe("investigate")
      expect(result.autoRetry).toBe(false)
    })

    it("returns P1 for payment_intent.succeeded", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "payment_intent.succeeded",
        error: "some unknown error",
      })
      expect(result.severity).toBe("P1")
    })
  })

  // ── Non-revenue webhook failure ─────────────────
  describe("non-revenue webhook failure", () => {
    it("returns P2 for checkout.session.expired", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        eventType: "checkout.session.expired",
        error: "some unrecognized error",
      })
      expect(result.severity).toBe("P2")
      expect(result.action).toBe("investigate")
    })

    it("returns P2 for unknown eventType", () => {
      const result = evaluateDlqEvent({
        event: "webhook_processing_failed",
        error: "something broke",
      })
      expect(result.severity).toBe("P2")
    })
  })

  // ── Retry failure codes ─────────────────────────
  describe("dlq.retry_failed", () => {
    it("resolves already_resolved with no action", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "already_resolved",
      })
      expect(result.action).toBe("resolve")
      expect(result.severity).toBe("P3")
    })

    it("investigates not_found", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "not_found",
      })
      expect(result.action).toBe("investigate")
    })

    it("resolves not_retryable", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "not_retryable",
      })
      expect(result.action).toBe("resolve")
    })

    it("escalates max_attempts as P2", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "max_attempts",
      })
      expect(result.severity).toBe("P2")
      expect(result.action).toBe("escalate")
    })

    it("upgrades max_attempts to P1 for revenue eventType", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "max_attempts",
        eventType: "checkout.session.completed",
      })
      expect(result.severity).toBe("P1")
      expect(result.action).toBe("escalate")
    })

    it("investigates domain_error", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "domain_error",
        error: "Order not found: ord-123",
      })
      expect(result.action).toBe("investigate")
    })

    it("upgrades domain_error to P2 for revenue eventType", () => {
      const result = evaluateDlqEvent({
        event: "dlq.retry_failed",
        code: "domain_error",
        eventType: "payment_intent.succeeded",
      })
      expect(result.severity).toBe("P2")
    })
  })

  // ── Other events ────────────────────────────────
  describe("other events", () => {
    it("handles dlq_backlog_growing", () => {
      const result = evaluateDlqEvent({ event: "dlq_backlog_growing" })
      expect(result.severity).toBe("P2")
      expect(result.action).toBe("investigate")
    })

    it("handles dlq_retry_update_failed", () => {
      const result = evaluateDlqEvent({ event: "dlq_retry_update_failed" })
      expect(result.severity).toBe("P3")
      expect(result.action).toBe("investigate")
    })
  })

  // ── Unknown fallback ────────────────────────────
  describe("unknown events", () => {
    it("returns P2 + investigate for completely unknown event", () => {
      const result = evaluateDlqEvent({ event: "some_future_event" })
      expect(result.severity).toBe("P2")
      expect(result.action).toBe("investigate")
      expect(result.autoRetry).toBe(false)
      expect(result.reason).toContain("Unknown")
    })
  })

  // ── Structural guarantees ───────────────────────
  describe("output shape", () => {
    it("always returns all required fields", () => {
      const result = evaluateDlqEvent({ event: "webhook_processing_failed" })
      expect(result).toHaveProperty("severity")
      expect(result).toHaveProperty("action")
      expect(result).toHaveProperty("autoRetry")
      expect(result).toHaveProperty("reason")
      expect(result).toHaveProperty("runbook")
      expect(typeof result.autoRetry).toBe("boolean")
    })
  })
})
