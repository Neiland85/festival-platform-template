import { revalidateTag } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"
import { rateLimit, setRateLimitHeaders } from "@/lib/rate-limit"
import { z } from "zod"

/**
 * POST /api/v1/revalidate
 *
 * Webhook endpoint for Sanity to trigger on-demand revalidation.
 *
 * Sanity sends a POST with a JSON body containing the document type.
 * We revalidate the corresponding cache tag so Next.js fetches fresh data.
 *
 * Security:
 * - Validates SANITY_REVALIDATE_SECRET header
 * - Rate limited to prevent revalidation DoS
 * - Input validated with Zod schema
 */

const ALLOWED_TYPES = ["event", "siteConfig", "artist"] as const

const revalidateBodySchema = z.object({
  _type: z.enum(ALLOWED_TYPES).optional(),
  eventId: z
    .string()
    .max(200)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
})

export async function POST(req: NextRequest) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { serverEnv } = await import("@/lib/env")

  // Rate limiting — prevent revalidation DoS
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rateLimitResult = await rateLimit(ip)

  if (!rateLimitResult.allowed) {
    const headers = new Headers()
    setRateLimitHeaders(headers, rateLimitResult)
    return NextResponse.json(
      { error: "Too many revalidation requests" },
      { status: 429, headers },
    )
  }

  const secret = req.headers.get("x-sanity-secret")
  const expectedSecret = serverEnv.SANITY_REVALIDATE_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "SANITY_REVALIDATE_SECRET not configured" },
      { status: 500 },
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  try {
    const rawBody: unknown = await req.json()
    const parsed = revalidateBodySchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { _type, eventId } = parsed.data

    // Revalidate based on document type
    switch (_type) {
      case "event":
        revalidateTag("events")
        if (eventId) {
          revalidateTag(`event-${eventId}`)
        }
        break
      case "siteConfig":
        revalidateTag("siteConfig")
        break
      case "artist":
        revalidateTag("artists")
        break
      default:
        // Revalidate everything for unknown types
        revalidateTag("events")
        revalidateTag("siteConfig")
    }

    return NextResponse.json({ revalidated: true, type: _type })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
