/**
 * GET /api/admin/spud/outcomes — list conversion outcomes
 *
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { outcomesQuerySchema } from "@/contracts/schemas/spud.schema"
import { findOutcomes } from "@/adapters/db/spud-outcome-repository"

export const GET = safeHandler(async (req: NextRequest) => {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = outcomesQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query params", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const outcomes = await findOutcomes(parsed.data.limit)

  return NextResponse.json(
    { outcomes, total: outcomes.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})
