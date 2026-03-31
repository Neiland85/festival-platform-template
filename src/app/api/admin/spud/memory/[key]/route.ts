/**
 * DELETE /api/admin/spud/memory/[key]
 *
 * Delete a memory entry by key. Requires category as query param.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { deleteMemory } from "@/adapters/db/spud-memory-repository"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const { key } = await params
  const url = new URL(req.url)
  const category = url.searchParams.get("category") ?? "general"

  const deleted = await deleteMemory(category, decodeURIComponent(key))

  if (!deleted) {
    return NextResponse.json({ error: "entry not found" }, { status: 404 })
  }

  return NextResponse.json(
    { ok: true, deleted: true },
    { headers: { "Cache-Control": "no-store" } },
  )
}
