/**
 * GET /api/admin/spud/campaigns
 *
 * Lists campaign drafts from spud_memory (category: "campaigns").
 * Convenience endpoint — formats memory entries for dashboard display.
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import type { CampaignDraft } from "@/domain/spud/types"

export const GET = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { listMemory } = await import("@/adapters/db/spud-memory-repository")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam
    ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100)
    : 20

  const entries = await listMemory({ category: "campaigns", limit })

  const campaigns = entries.map((entry) => {
    const draft = entry.value as CampaignDraft
    return {
      id: entry.id,
      memoryKey: entry.memoryKey,
      segmentId: draft.segmentId ?? null,
      segmentName: draft.segmentName ?? null,
      subject: draft.subject ?? null,
      body: draft.body ?? null,
      reasoning: draft.reasoning ?? null,
      tone: draft.tone ?? null,
      language: draft.language ?? null,
      modelUsed: draft.modelUsed ?? null,
      generatedAt: draft.generatedAt ?? entry.createdAt,
    }
  })

  return NextResponse.json(
    { campaigns, total: campaigns.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})
