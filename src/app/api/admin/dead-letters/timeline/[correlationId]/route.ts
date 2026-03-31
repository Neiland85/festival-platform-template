import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { getDeadLettersByEventId } from "@/lib/webhooks/dead-letter-queue"
import { evaluateDlqEvent } from "@/lib/webhooks/dlq-decision-engine"

/** Must match dlq-auto-retry.ts */
const MAX_AUTO_RETRIES = 2

type TimelineEvent = {
  timestamp: string
  type: string
  source: "db" | "inferred"
  message: string
  severity: "info" | "warn" | "error"
  meta?: Record<string, unknown>
}

export const GET = safeHandler(async (
  req: NextRequest,
) => {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  // Extract correlationId from URL path (last segment after /timeline/)
  const segments = req.nextUrl.pathname.split("/")
  const correlationId = segments[segments.length - 1]

  if (!correlationId || correlationId === "timeline") {
    return NextResponse.json({ error: "correlationId is required" }, { status: 400 })
  }

  const entries = await getDeadLettersByEventId(correlationId)

  if (entries.length === 0) {
    return NextResponse.json(
      { correlationId, timeline: [], message: "No DLQ entries found for this correlationId" },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const timeline: TimelineEvent[] = []

  // Use the first (oldest) entry for shared metadata
  const oldest = entries[entries.length - 1]!

  // ── Step 1: Webhook received (inferred — we know Stripe delivered it
  //    because a DLQ entry exists, but we don't persist the receive timestamp)
  timeline.push({
    timestamp: oldest.createdAt.toISOString(),
    type: "webhook.received",
    source: "inferred",
    message: `Stripe webhook ${oldest.eventType} received from ${oldest.provider}`,
    severity: "info",
    meta: { eventType: oldest.eventType, provider: oldest.provider },
  })

  // ── Steps 2+3 per DLQ entry: handler failure + DLQ persisted
  for (const entry of [...entries].reverse()) {
    timeline.push({
      timestamp: entry.createdAt.toISOString(),
      type: "handler.failed",
      source: "db",
      message: `Domain handler threw: ${entry.error}`,
      severity: "error",
      meta: { dlqId: entry.id, error: entry.error },
    })

    timeline.push({
      timestamp: entry.createdAt.toISOString(),
      type: "dlq.persisted",
      source: "db",
      message: `Event persisted to dead-letter queue (id: ${entry.id})`,
      severity: "warn",
      meta: { dlqId: entry.id, attempts: entry.attempts },
    })

    // ── Step 4: Retry attempts (inferred from attempts counter + decision engine)
    // attempts starts at 1 (initial failure). Each retry increments it.
    // We use the decision engine to determine if retries were auto or manual.
    const decision = evaluateDlqEvent({
      event: "webhook_processing_failed",
      eventType: entry.eventType,
      error: entry.error,
    })
    const wasAutoRetryEligible = decision.autoRetry

    if (entry.attempts > 1) {
      const retryCount = entry.attempts - 1
      // Retries within MAX_AUTO_RETRIES and eligible = likely auto-retry
      const autoRetryCount = wasAutoRetryEligible
        ? Math.min(retryCount, MAX_AUTO_RETRIES)
        : 0
      const manualRetryCount = retryCount - autoRetryCount
      const retryLabel = wasAutoRetryEligible ? "auto-retry" : "manual retry"

      if (entry.resolvedAt) {
        // Last retry succeeded
        if (retryCount > 1) {
          timeline.push({
            timestamp: entry.resolvedAt.toISOString(),
            type: wasAutoRetryEligible ? "auto_retry.failed" : "retry.failed",
            source: "inferred",
            message: `${retryCount - 1} ${retryLabel} attempt(s) failed before success`,
            severity: "warn",
            meta: { dlqId: entry.id, failedAttempts: retryCount - 1, autoRetryEligible: wasAutoRetryEligible },
          })
        }

        timeline.push({
          timestamp: entry.resolvedAt.toISOString(),
          type: wasAutoRetryEligible ? "auto_retry.succeeded" : "retry.succeeded",
          source: "db",
          message: `${retryLabel} succeeded — entry resolved after ${retryCount} attempt(s)`,
          severity: "info",
          meta: { dlqId: entry.id, totalAttempts: entry.attempts, autoRetries: autoRetryCount, manualRetries: manualRetryCount },
        })
      } else {
        // Not resolved → retries failed
        if (autoRetryCount > 0) {
          timeline.push({
            timestamp: entry.createdAt.toISOString(),
            type: "auto_retry.exhausted",
            source: "inferred",
            message: `${autoRetryCount} auto-retry attempt(s) failed — auto-retry limit reached`,
            severity: "warn",
            meta: { dlqId: entry.id, autoRetries: autoRetryCount, maxAutoRetries: MAX_AUTO_RETRIES },
          })
        }
        if (manualRetryCount > 0) {
          timeline.push({
            timestamp: entry.createdAt.toISOString(),
            type: "retry.failed",
            source: "inferred",
            message: `${manualRetryCount} manual retry attempt(s) also failed`,
            severity: "warn",
            meta: { dlqId: entry.id, manualRetries: manualRetryCount, lastError: entry.error },
          })
        }
        if (autoRetryCount === 0 && manualRetryCount === 0) {
          // Fallback: generic retry failed
          timeline.push({
            timestamp: entry.createdAt.toISOString(),
            type: "retry.failed",
            source: "inferred",
            message: `${retryCount} retry attempt(s) failed — entry still unresolved`,
            severity: "warn",
            meta: { dlqId: entry.id, attempts: entry.attempts, lastError: entry.error },
          })
        }
      }
    } else if (!entry.resolvedAt && wasAutoRetryEligible) {
      // attempts = 1, not resolved, but eligible → auto-retry is pending
      timeline.push({
        timestamp: entry.createdAt.toISOString(),
        type: "auto_retry.pending",
        source: "inferred",
        message: "Auto-retry scheduled — transient error detected, system will retry automatically",
        severity: "info",
        meta: { dlqId: entry.id, decision: { action: decision.action, severity: decision.severity } },
      })
    }

    // ── Step 5: Manual resolve (resolved but attempts = 1 → no retry, operator resolved it)
    if (entry.resolvedAt && entry.attempts <= 1) {
      timeline.push({
        timestamp: entry.resolvedAt.toISOString(),
        type: "manual.resolved",
        source: "db",
        message: "Operator manually resolved the entry (no retry attempted)",
        severity: "info",
        meta: { dlqId: entry.id },
      })
    }
  }

  // Sort by timestamp ascending (chronological)
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return NextResponse.json(
    {
      correlationId,
      eventType: oldest.eventType,
      provider: oldest.provider,
      totalEntries: entries.length,
      timeline,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
})
