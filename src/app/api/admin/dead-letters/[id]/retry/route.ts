import { NextRequest, NextResponse } from "next/server"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { retryDeadLetter, getDeadLetter } from "@/lib/webhooks/dead-letter-queue"
import { log } from "@/lib/logger"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. CSRF — reject forged cross-origin requests (O(1), no side effects)
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
  }

  // 2. Auth — reject unauthenticated requests
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  // 3. Fetch entry metadata for structured logging (PK lookup, ~1ms)
  const { id } = await params
  const entry = await getDeadLetter(id)
  const correlationId = entry?.eventId ?? id
  const logMeta = {
    dlqId: id,
    correlationId,
    eventType: entry?.eventType,
    provider: entry?.provider,
  }

  // 4. Delegate to domain layer (handles all guards: not_found, already_resolved,
  //    max_attempts, not_retryable, domain_error)
  const result = await retryDeadLetter(id)

  if (!result.ok) {
    log("warn", "dlq.retry_failed", { ...logMeta, code: result.code, reason: result.reason })

    const statusMap: Record<string, number> = {
      not_found: 404,
      already_resolved: 409,
      max_attempts: 429,
      not_retryable: 422,
      domain_error: 500,
    }

    return NextResponse.json(
      { error: result.reason, code: result.code },
      { status: statusMap[result.code] ?? 500 },
    )
  }

  log("info", "dlq.retry_success", logMeta)

  return NextResponse.json({ ok: true, id })
}
