/**
 * GET /api/admin/spud/runs/[id]
 *
 * Returns run detail with its tasks.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { findRunById, findTasksByRunId } = await import("@/adapters/db/spud-run-repository")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const { id } = await params

  const run = await findRunById(id)
  if (!run) {
    return NextResponse.json({ error: "run not found" }, { status: 404 })
  }

  const tasks = await findTasksByRunId(id)

  return NextResponse.json(
    { run, tasks },
    { headers: { "Cache-Control": "no-store" } },
  )
}
