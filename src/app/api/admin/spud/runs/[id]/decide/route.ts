/**
 * POST /api/admin/spud/runs/[id]/decide
 *
 * Approve or reject a run that's awaiting approval.
 * On approval: executes the run. On rejection: cancels it.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { decideApprovalSchema } from "@/contracts/schemas/spud.schema"
import { findRunById, updateRun } from "@/adapters/db/spud-run-repository"
import { canDecide, isApprovalExpired, resolveDecision, resolveExpired } from "@/domain/spud/approvals"
import { createPlan } from "@/domain/spud/planner"
import { executeRun } from "@/domain/spud/executor"
import { buildExecutorDeps } from "../../_deps"
import type { PlanGoal, ApprovalStatus } from "@/domain/spud/types"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 })
    }

    const { id } = await params

    const body: unknown = await req.json()
    const parsed = decideApprovalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // ── Find run ──
    const run = await findRunById(id)
    if (!run) {
      return NextResponse.json({ error: "run not found" }, { status: 404 })
    }

    // ── Check if expired first ──
    if (run.approvalStatus === "pending" && isApprovalExpired(run.createdAt)) {
      const expired = resolveExpired()
      await updateRun(id, {
        status: expired.runStatus,
        approvalStatus: expired.approvalStatus,
      })
      return NextResponse.json(
        { error: "approval expired", runId: id },
        { status: 410 },
      )
    }

    // ── Check if decision is possible ──
    if (!canDecide(run.approvalStatus as ApprovalStatus | null)) {
      return NextResponse.json(
        {
          error: "cannot decide on this run",
          currentApprovalStatus: run.approvalStatus,
        },
        { status: 409 },
      )
    }

    const { decision, reason } = parsed.data
    const resolution = resolveDecision(decision)

    // ── Apply decision ──
    await updateRun(id, {
      status: resolution.runStatus,
      approvalStatus: resolution.approvalStatus,
      approvalDecidedBy: "admin",
      approvalDecidedAt: new Date(),
      approvalReason: reason,
    })

    // ── If approved, execute the run ──
    if (decision === "approved") {
      const input = run.input as { goal?: string; params?: Record<string, unknown> }
      const goal = (input.goal ?? "score_all") as PlanGoal
      const params = input.params

      const deps = buildExecutorDeps()
      const leadCount = await deps.countLeads()
      const plan = createPlan(goal, leadCount, params)
      const result = await executeRun(plan, deps)

      return NextResponse.json(
        { decision: "approved", result },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      )
    }

    // ── Rejected ──
    return NextResponse.json(
      { decision: "rejected", runId: id },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
}
