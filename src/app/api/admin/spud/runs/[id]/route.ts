/**
 * GET /api/admin/spud/runs/[id]
 *
 * Returns run detail with its tasks.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { findRunById, findTasksByRunId } from "@/adapters/db/spud-run-repository"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
