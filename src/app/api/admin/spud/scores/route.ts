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
import { findScores } from "@/adapters/db/spud-score-repository"
import { spudScoresQuerySchema } from "@/contracts/schemas/spud.schema"

export const GET = safeHandler(async (req: NextRequest) => {
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
