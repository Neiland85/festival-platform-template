/**
 * POST /api/admin/spud/plan
 *
 * Dry-run: generates a plan without executing it.
 * Protected with requireAdmin.
 *
 * Body: { goal: "score_all" | "score_segment", params?: Record<string, unknown> }
 * Response: { plan, estimatedLeads }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { createPlanSchema } from "@/contracts/schemas/spud.schema"

export const POST = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { getPool } = await import("@/adapters/db/pool")
  const { createPlan } = await import("@/domain/spud/planner")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = createPlanSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { goal, params } = parsed.data

  // ── Count leads ──
  const pool = getPool()
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM leads WHERE deleted_at IS NULL`,
  )
  const leadCount = (result.rows[0]?.cnt as number) ?? 0

  // ── Generate plan (no execution) ──
  const plan = createPlan(goal, leadCount, params)

  return NextResponse.json(
    {
      plan,
      estimatedLeads: leadCount,
      estimatedTasks: plan.tasks.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
})
