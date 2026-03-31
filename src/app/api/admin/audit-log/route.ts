/**
 * GET /api/admin/audit-log
 *
 * Expone el trail de auditoría con filtros opcionales.
 * Protegido con requireAdmin.
 *
 * Query params:
 *   ?limit=50          — máximo de entradas (default 100)
 *   ?action=leads.view — filtrar por tipo de acción
 *   ?actor=admin       — filtrar por actor
 *   ?since=2026-03-10  — entradas desde fecha ISO
 *
 * Response:
 * {
 *   entries: AuditEvent[],  // from PostgreSQL audit_events table
 *   total: number
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { queryAuditEvents } from "@/adapters/db/audit-repository"

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit")
  const actionParam = url.searchParams.get("action")
  const actorParam = url.searchParams.get("actor")
  const sinceParam = url.searchParams.get("since")

  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 100), 1000) : 100

  const entries = await queryAuditEvents({
    limit,
    action: actionParam ?? undefined,
    actor: actorParam ?? undefined,
    since: sinceParam ?? undefined,
  })

  return NextResponse.json(
    {
      entries,
      total: entries.length,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  )
}
