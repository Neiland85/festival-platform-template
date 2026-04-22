import { NextRequest, NextResponse } from "next/server"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { resolveDeadLetter, getDeadLetter } from "@/lib/webhooks/dead-letter-queue"
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

  // 3. Validate target exists and is actionable
  const { id } = await params
  const entry = await getDeadLetter(id)

  if (!entry) {
    return NextResponse.json({ error: "Dead letter not found" }, { status: 404 })
  }

  if (entry.resolvedAt !== null) {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 })
  }

  // 4. Execute mutation
  await resolveDeadLetter(id)

  log("info", "dlq.resolve", {
    dlqId: id,
    correlationId: entry.eventId,
    eventType: entry.eventType,
    provider: entry.provider,
  })

  return NextResponse.json({ ok: true, id })
}
