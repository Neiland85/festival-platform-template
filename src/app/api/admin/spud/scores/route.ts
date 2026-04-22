/**
 * GET /api/admin/spud/scores
 *
 * Lists lead scores with optional tier filter.
 * Protected with requireAdmin.
 *
 * Query params:
 *   ?limit=50          — max entries (default 50, max 100)
 *   ?tier=hot          — filter by tier (hot | warm | cold)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { spudScoresQuerySchema } from "@/contracts/schemas/spud.schema"

export const GET = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { findScores } = await import("@/adapters/db/spud-score-repository")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = spudScoresQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    tier: url.searchParams.get("tier") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query params", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const scores = await findScores({
    tier: parsed.data.tier,
    limit: parsed.data.limit,
  })

  return NextResponse.json(
    { scores, total: scores.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})
