/**
 * GET  /api/admin/spud/segments — list segments
 * POST /api/admin/spud/segments — create segment with snapshot count
 *
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { createSegmentSchema, segmentQuerySchema } from "@/contracts/schemas/spud.schema"

export const GET = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { createSegment, findSegments } = await import("@/adapters/db/spud-segment-repository")
  const { validateSegmentFilters } = await import("@/domain/spud/segments")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = segmentQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query params", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const segments = await findSegments(parsed.data.limit)

  return NextResponse.json(
    { segments, total: segments.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})

export const POST = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { createSegment, findSegments } = await import("@/adapters/db/spud-segment-repository")
  const { validateSegmentFilters } = await import("@/domain/spud/segments")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = createSegmentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { name, description, filters } = parsed.data

  // Domain validation
  const cleanFilters = validateSegmentFilters(filters)

  const id = await createSegment(name, cleanFilters, "admin", description)

  return NextResponse.json(
    { id, name },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  )
})
