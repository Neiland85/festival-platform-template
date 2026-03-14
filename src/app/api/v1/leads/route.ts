import { NextRequest, NextResponse } from "next/server"
import { createLead } from "@/domain/leads/create-lead"
import { enqueueLead } from "@/lib/security/queueFacade"
import { processLeadQueue } from "@/lib/security/leadWorker"
import { _getClientIp, _isValidIp } from "@/lib/ip"
import { log } from "@/lib/logger"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { hashIp } from "@/lib/security/hashIp"
import { rateLimit } from "@/lib/rate-limit"
import * as Sentry from "@sentry/nextjs"
import { checkIdempotencyKey, isValidIdempotencyKey } from "@/lib/security/idempotency"
import { leadCreateSchema } from "@/contracts/schemas/lead.schema"

export { _getClientIp, _isValidIp }

export async function POST(req: NextRequest) {

  try {

    // Idempotency-Key: evitar procesamiento duplicado en retries del cliente
    const idempotencyKey = req.headers.get("idempotency-key")
    if (idempotencyKey) {
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return NextResponse.json(
          { error: "invalid idempotency key format (UUID v4 expected)" },
          { status: 400 }
        )
      }
      if (await checkIdempotencyKey(idempotencyKey)) {
        return NextResponse.json({ success: true, deduplicated: true })
      }
    }

    const rawIpForRl = _getClientIp(req)
    const allowed = await rateLimit(rawIpForRl)
    if (!allowed) {
      return NextResponse.json(
        { error: "too many requests" },
        { status: 429 }
      )
    }

    if (!verifyCsrf(req)) {
      return NextResponse.json(
        { error: "invalid csrf token" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = leadCreateSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      const detail = firstError?.message ?? "invalid payload"
      return NextResponse.json({ error: detail }, { status: 400 })
    }

    const rawIp = _getClientIp(req)

    const lead = createLead({
      email: parsed.data.email,
      eventId: parsed.data.eventId,
      ipAddress: hashIp(rawIp),
      consentGiven: parsed.data.consentGiven,
      name: parsed.data.name,
      surname: parsed.data.surname,
      phone: parsed.data.phone,
      profession: parsed.data.profession,
      source: parsed.data.source,
    })

    await enqueueLead(lead)

    processLeadQueue()

    return NextResponse.json({ success: true })

  } catch (error) {

    log("error", "lead_api_error", { error })
    Sentry.captureException(error, { tags: { route: "/api/v1/leads" } })

    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    )

  }

}
