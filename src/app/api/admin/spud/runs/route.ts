/**
 * GET  /api/admin/spud/runs — list runs with filters
 * POST /api/admin/spud/runs — create and execute a run
 *
 * Phase 2: idempotency key support + approval gate.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { spudRunsQuerySchema, createPlanSchema } from "@/contracts/schemas/spud.schema"
import { buildExecutorDeps } from "./_deps"

export const GET = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { findRuns, findRunByIdempotencyKey, createRun } = await import("@/adapters/db/spud-run-repository")
  const { createPlan } = await import("@/domain/spud/planner")
  const { executeRun } = await import("@/domain/spud/executor")
  const { requiresApproval } = await import("@/domain/spud/approvals")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = spudRunsQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query params", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const runs = await findRuns({
    type: parsed.data.type,
    status: parsed.data.status,
    limit: parsed.data.limit,
  })

  return NextResponse.json(
    { runs, total: runs.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})

export const POST = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { findRuns, findRunByIdempotencyKey, createRun } = await import("@/adapters/db/spud-run-repository")
  const { createPlan } = await import("@/domain/spud/planner")
  const { executeRun } = await import("@/domain/spud/executor")
  const { requiresApproval } = await import("@/domain/spud/approvals")

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

  const { goal, params, idempotencyKey } = parsed.data

  // ── Idempotency check ──
  if (idempotencyKey) {
    const existing = await findRunByIdempotencyKey(idempotencyKey)
    if (existing) {
      if (existing.status === "completed") {
        return NextResponse.json(
          { result: existing, cached: true },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        )
      }
      if (existing.status === "running") {
        return NextResponse.json(
          { error: "run in progress", runId: existing.id },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        )
      }
      // pending (awaiting approval or about to run) — return existing
      if (existing.status === "pending") {
        return NextResponse.json(
          { result: existing, cached: true },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        )
      }
    }
  }

  // ── Approval gate ──
  if (requiresApproval(goal)) {
    const runId = await createRun({
      type: "scoring",
      input: { goal, params: params ?? {} },
      idempotencyKey: idempotencyKey ?? undefined,
      approvalStatus: "pending",
      approvalRequestedBy: "admin",
    })

    return NextResponse.json(
      { approvalRequired: true, runId },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    )
  }

  // ── Normal execution ──
  const deps = buildExecutorDeps()
  const leadCount = await deps.countLeads()
  const plan = createPlan(goal, leadCount, params)
  const result = await executeRun(plan, deps)

  return NextResponse.json(
    { result },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  )
})
