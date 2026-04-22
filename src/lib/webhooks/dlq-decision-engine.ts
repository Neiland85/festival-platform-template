/**
 * DLQ Decision Engine
 *
 * Pure, deterministic function that converts a DLQ log event into an
 * operational decision: severity, recommended action, auto-retry eligibility.
 *
 * Encodes the runbook rules so on-call engineers (and future automation)
 * get consistent, auditable triage without reading prose.
 *
 * Zero side effects. Zero I/O. Fully unit-testable.
 */

// ── Types ───────────────────────────────────────────────

export type DlqEventInput = {
  event: string
  eventType?: string
  error?: string
  code?: string
}

export type Severity = "P1" | "P2" | "P3"
export type Action = "retry" | "resolve" | "investigate" | "escalate"

export type DlqDecision = {
  severity: Severity
  action: Action
  autoRetry: boolean
  reason: string
  runbook: string
}

// ── Rules ───────────────────────────────────────────────

/**
 * Event types where failure = direct revenue impact.
 * Any failure on these auto-upgrades severity to P1.
 */
const REVENUE_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded",
])

/**
 * Error patterns that indicate the domain already handled the event
 * correctly. These are NOT bugs — they're idempotency guards firing.
 * Action: resolve immediately, no retry.
 */
const SAFE_ERROR_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /status is not reserved/i, label: "Order already in terminal state (idempotency guard)" },
  { pattern: /already completed/i, label: "Order already completed" },
  { pattern: /already cancelled/i, label: "Order already cancelled" },
  { pattern: /duplicate idempotency key/i, label: "Event already processed (idempotency dedup)" },
]

/**
 * Error patterns that indicate a transient infrastructure failure.
 * These are safe for automatic retry.
 */
const TRANSIENT_ERROR_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /connection refused/i, label: "Database connection refused" },
  { pattern: /ECONNREFUSED/i, label: "Connection refused (TCP)" },
  { pattern: /connection timeout/i, label: "Database connection timeout" },
  { pattern: /ETIMEDOUT/i, label: "Connection timed out (TCP)" },
  { pattern: /too many connections/i, label: "Connection pool exhausted" },
  { pattern: /pool .* exhausted/i, label: "Connection pool exhausted" },
  { pattern: /ECONNRESET/i, label: "Connection reset" },
  { pattern: /statement timeout/i, label: "Query timeout" },
]

/**
 * Maps retry failure codes to decisions.
 * These handle the `dlq.retry_failed` event specifically.
 */
const RETRY_FAILURE_RULES: Record<string, Omit<DlqDecision, "severity">> = {
  already_resolved: {
    action: "resolve",
    autoRetry: false,
    reason: "Entry was already resolved by another operator — no action needed",
    runbook: "RUNBOOK-3: dlq.retry_failed → code=already_resolved → close",
  },
  not_found: {
    action: "investigate",
    autoRetry: false,
    reason: "DLQ entry not found — may have been deleted or ID is incorrect",
    runbook: "RUNBOOK-3: dlq.retry_failed → code=not_found → verify dlqId",
  },
  not_retryable: {
    action: "resolve",
    autoRetry: false,
    reason: "Event type is not in the safe-retry allowlist — must be handled manually",
    runbook: "RUNBOOK-3: dlq.retry_failed → code=not_retryable → manual resolution",
  },
  max_attempts: {
    action: "escalate",
    autoRetry: false,
    reason: "Maximum retry attempts exhausted — requires manual DB intervention or Stripe replay",
    runbook: "RUNBOOK-3: dlq.retry_failed → code=max_attempts → reset attempts or stripe events resend",
  },
  domain_error: {
    action: "investigate",
    autoRetry: false,
    reason: "Domain handler threw on retry — root cause may still be present",
    runbook: "RUNBOOK-3: dlq.retry_failed → code=domain_error → investigate reason field",
  },
}

// ── Engine ──────────────────────────────────────────────

export function evaluateDlqEvent(input: DlqEventInput): DlqDecision {
  const { event, eventType, error, code } = input

  // ── Rule 1: DLQ persist failed → always P1, always escalate
  if (event === "dlq_persist_failed") {
    return {
      severity: "P1",
      action: "escalate",
      autoRetry: false,
      reason: "DLQ persistence failed — event data exists only in logs and may be lost",
      runbook: "RUNBOOK-2: dlq_persist_failed → extract from logs → manual insert or stripe events resend",
    }
  }

  // ── Rule 2: Safe errors → resolve immediately
  if (error) {
    for (const { pattern, label } of SAFE_ERROR_PATTERNS) {
      if (pattern.test(error)) {
        return {
          severity: "P3",
          action: "resolve",
          autoRetry: false,
          reason: `Safe error: ${label}. No bug — resolve without retry.`,
          runbook: "RUNBOOK-1: webhook_processing_failed → safe error table → resolve",
        }
      }
    }
  }

  // ── Rule 3: Retry failure codes (dlq.retry_failed)
  if (event === "dlq.retry_failed" && code) {
    const rule = RETRY_FAILURE_RULES[code]
    if (rule) {
      const isRevenue = eventType ? REVENUE_EVENT_TYPES.has(eventType) : false

      // max_attempts on revenue event → P1
      let severity: Severity = "P3"
      if (code === "max_attempts") severity = isRevenue ? "P1" : "P2"
      else if (code === "domain_error") severity = isRevenue ? "P2" : "P3"

      return { severity, ...rule }
    }
  }

  // ── Rule 4: Transient errors → auto-retry eligible
  if (error) {
    for (const { pattern, label } of TRANSIENT_ERROR_PATTERNS) {
      if (pattern.test(error)) {
        const isRevenue = eventType ? REVENUE_EVENT_TYPES.has(eventType) : false
        return {
          severity: isRevenue ? "P2" : "P3",
          action: "retry",
          autoRetry: true,
          reason: `Transient failure: ${label}. Safe for automatic retry.`,
          runbook: "RUNBOOK-1: webhook_processing_failed → transient error → auto-retry",
        }
      }
    }
  }

  // ── Rule 5: webhook_processing_failed (non-safe, non-transient)
  if (event === "webhook_processing_failed") {
    const isRevenue = eventType ? REVENUE_EVENT_TYPES.has(eventType) : false
    return {
      severity: isRevenue ? "P1" : "P2",
      action: "investigate",
      autoRetry: false,
      reason: isRevenue
        ? "Revenue-impacting webhook failed with unknown error — investigate immediately"
        : "Webhook processing failed — inspect error in admin dashboard before retrying",
      runbook: "RUNBOOK-1: webhook_processing_failed → inspect dashboard → determine retry or escalate",
    }
  }

  // ── Rule 6: Backlog growth alert
  if (event === "dlq_backlog_growing") {
    return {
      severity: "P2",
      action: "investigate",
      autoRetry: false,
      reason: "Multiple DLQ entries accumulating — check for systemic failure or recent deploy",
      runbook: "RUNBOOK-4: backlog growth → check deploys → rollback or fix then drain",
    }
  }

  // ── Rule 7: Retry bookkeeping failure
  if (event === "dlq_retry_update_failed") {
    return {
      severity: "P3",
      action: "investigate",
      autoRetry: false,
      reason: "DLQ record update failed after retry — verify order state and fix record manually",
      runbook: "RUNBOOK-5: dlq_retry_update_failed → verify order state → fix DLQ record via SQL",
    }
  }

  // ── Fallback: unknown event
  return {
    severity: "P2",
    action: "investigate",
    autoRetry: false,
    reason: `Unknown DLQ event: ${event}. Manual investigation required.`,
    runbook: "No specific runbook — start with /dashboard/dead-letters and correlationId search",
  }
}
