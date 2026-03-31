/**
 * POST /api/admin/spud/score
 *
 * Score a single lead by ID.
 * Protected with requireAdmin.
 *
 * Body: { leadId: string }
 * Response: { score: LeadScore }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { safeHandler } from "@/lib/api/safeHandler"
import { scoreLeadSchema } from "@/contracts/schemas/spud.schema"
import { scoreLead } from "@/domain/spud/scorer"
import { saveScore, findScoreByLeadId } from "@/adapters/db/spud-score-repository"
import { getPool } from "@/adapters/db/pool"
import type { LeadData, ScoringContext } from "@/domain/spud/types"

export const POST = safeHandler(async (req: NextRequest) => {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = scoreLeadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { leadId } = parsed.data
  const pool = getPool()

  // ── Fetch lead data ──
  const leadResult = await pool.query(
    `SELECT id, email, name, surname, phone, profession, source, created_at, event_id
     FROM leads
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [leadId],
  )

  if (leadResult.rows.length === 0) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 })
  }

  const row = leadResult.rows[0]
  const lead: LeadData = {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string | null,
    surname: row.surname as string | null,
    phone: row.phone as string | null,
    profession: row.profession as string | null,
    source: row.source as string,
    createdAt: new Date(row.created_at as string),
    eventId: row.event_id as string,
  }

  // ── Fetch scoring context ──
  const context = await fetchScoringContext(pool, lead.email)

  // ── Score ──
  const result = scoreLead(lead, context)

  // ── Persist ──
  await saveScore({
    leadId: result.leadId,
    score: result.score,
    tier: result.tier,
    factors: result.factors,
  })

  // ── Return persisted score ──
  const persisted = await findScoreByLeadId(leadId)

  return NextResponse.json(
    { score: persisted ?? result },
    { headers: { "Cache-Control": "no-store" } },
  )
})

async function fetchScoringContext(
  pool: ReturnType<typeof getPool>,
  email: string,
): Promise<ScoringContext> {
  const [eventRes, orderRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT event_id)::int AS cnt
       FROM leads
       WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM orders
       WHERE customer_email = $1 AND status = 'completed'`,
      [email],
    ),
  ])

  return {
    eventCount: (eventRes.rows[0]?.cnt as number) ?? 0,
    completedOrders: (orderRes.rows[0]?.cnt as number) ?? 0,
  }
}
