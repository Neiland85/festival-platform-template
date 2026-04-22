/**
 * GET  /api/admin/spud/memory — list memory entries
 * POST /api/admin/spud/memory — set a memory entry
 *
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { setMemorySchema, memoryQuerySchema } from "@/contracts/schemas/spud.schema"

export const GET = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { setMemory, listMemory } = await import("@/adapters/db/spud-memory-repository")
  const { computeExpiresAt } = await import("@/domain/spud/memory")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = memoryQuerySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query params", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const entries = await listMemory({
    category: parsed.data.category,
    limit: parsed.data.limit,
  })

  return NextResponse.json(
    { entries, total: entries.length },
    { headers: { "Cache-Control": "no-store" } },
  )
})

export const POST = safeHandler(async (req: NextRequest) => {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { setMemory, listMemory } = await import("@/adapters/db/spud-memory-repository")
  const { computeExpiresAt } = await import("@/domain/spud/memory")

  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = setMemorySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { category, key, value, ttlSeconds } = parsed.data
  const expiresAt = ttlSeconds ? computeExpiresAt(ttlSeconds) : undefined

  await setMemory(category, key, value, expiresAt)

  return NextResponse.json(
    { ok: true, category, key },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  )
})
