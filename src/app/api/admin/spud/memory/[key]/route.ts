/**
 * DELETE /api/admin/spud/memory/[key]
 *
 * Delete a memory entry by key. Requires category as query param.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { deleteMemory } = await import("@/adapters/db/spud-memory-repository")

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
