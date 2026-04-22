import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { listDeadLetters } from "@/lib/webhooks/dead-letter-queue"
import { evaluateDlqEvent } from "@/lib/webhooks/dlq-decision-engine"

/** Max auto-retries before the worker gives up. Must match dlq-auto-retry.ts. */
const MAX_AUTO_RETRIES = 2

type EntryStatus =
  | "auto-retry pending"
  | "auto-retried (failed)"
  | "safe to resolve"
  | "manual intervention required"

function computeStatus(
  entry: { attempts: number; error: string; eventType: string },
): { status: EntryStatus; decision: { severity: string; action: string; autoRetry: boolean; reason: string } } {
  const decision = evaluateDlqEvent({
    event: "webhook_processing_failed",
    eventType: entry.eventType,
    error: entry.error,
  })

  let status: EntryStatus
  if (decision.autoRetry && entry.attempts <= MAX_AUTO_RETRIES) {
    status = "auto-retry pending"
  } else if (decision.autoRetry && entry.attempts > MAX_AUTO_RETRIES) {
    status = "auto-retried (failed)"
  } else if (decision.action === "resolve") {
    status = "safe to resolve"
  } else {
    status = "manual intervention required"
  }

  return {
    status,
    decision: {
      severity: decision.severity,
      action: decision.action,
      autoRetry: decision.autoRetry,
      reason: decision.reason,
    },
  }
}

export const GET = safeHandler(async (req: NextRequest) => {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200) : 50

  const rawEntries = await listDeadLetters(limit)

  const entries = rawEntries.map((entry) => {
    const { status, decision } = computeStatus(entry)
    return { ...entry, status, decision }
  })

  return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } })
})
