/**
 * GET    /api/admin/spud/segments/[id] — segment detail + preview leads
 * DELETE /api/admin/spud/segments/[id] — delete segment
 *
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import type { SegmentFilters } from "@/domain/spud/types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { findSegmentById,
  queryLeadsByFilters,
  deleteSegment, } = await import("@/adapters/db/spud-segment-repository")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const { id } = await params

  const segment = await findSegmentById(id)
  if (!segment) {
    return NextResponse.json({ error: "segment not found" }, { status: 404 })
  }

  // Preview: first 20 leads matching filters
  const previewLeads = await queryLeadsByFilters(
    segment.filters as SegmentFilters,
    0,
    20,
  )

  return NextResponse.json(
    { segment, previewLeads },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { findSegmentById,
  queryLeadsByFilters,
  deleteSegment, } = await import("@/adapters/db/spud-segment-repository")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const { id } = await params

  const deleted = await deleteSegment(id)
  if (!deleted) {
    return NextResponse.json({ error: "segment not found" }, { status: 404 })
  }

  return NextResponse.json(
    { ok: true, deleted: true },
    { headers: { "Cache-Control": "no-store" } },
  )
}
