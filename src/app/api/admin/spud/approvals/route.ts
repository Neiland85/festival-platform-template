/**
 * GET /api/admin/spud/approvals
 *
 * Lists runs that have an approval status (pending, approved, rejected, expired).
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { findRunsAwaitingApproval } from "@/adapters/db/spud-run-repository"

export const GET = safeHandler(async (req: NextRequest) => {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100) : 20

  const approvals = await findRunsAwaitingApproval(limit)

  return NextResponse.json(
    { approvals, total: approvals.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})
