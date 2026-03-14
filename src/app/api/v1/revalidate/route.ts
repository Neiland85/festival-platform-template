import { revalidateTag } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/v1/revalidate
 *
 * Webhook endpoint for Sanity to trigger on-demand revalidation.
 *
 * Sanity sends a POST with a JSON body containing the document type.
 * We revalidate the corresponding cache tag so Next.js fetches fresh data.
 *
 * Security: Validates SANITY_REVALIDATE_SECRET header.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-secret")
  const expectedSecret = process.env["SANITY_REVALIDATE_SECRET"]

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
    const body = (await req.json()) as { _type?: string; eventId?: string }

    // Revalidate based on document type
    switch (body._type) {
      case "event":
        revalidateTag("events", "default")
        if (body.eventId) {
          revalidateTag(`event-${body.eventId}`, "default")
        }
        break
      case "siteConfig":
        revalidateTag("siteConfig", "default")
        break
      case "artist":
        revalidateTag("artists", "default")
        break
      default:
        // Revalidate everything for unknown types
        revalidateTag("events", "default")
        revalidateTag("siteConfig", "default")
    }

    return NextResponse.json({ revalidated: true, type: body._type })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
