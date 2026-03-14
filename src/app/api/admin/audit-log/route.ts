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
 *   entries: AuditEntry[],
 *   total: number,
 *   bufferSize: number,
 *   stats: { actionCounts, lastEntry }
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import {
  getAuditLog,
  getAuditStats,
  type AuditAction,
} from "@/lib/observability/auditLog"

const VALID_ACTIONS: Set<string> = new Set([
  "admin.login",
  "admin.login_failed",
  "admin.logout",
  "event.create",
  "event.update",
  "event.delete",
  "leads.view",
  "leads.export",
  "leads.delete",
  "system.config_change",
  "system.queue_drain",
  "system.metrics_reset",
])

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
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

  // Validar action si se proporciona
  if (actionParam && !VALID_ACTIONS.has(actionParam)) {
    return NextResponse.json(
      { error: "invalid_action", validActions: [...VALID_ACTIONS] },
      { status: 400 }
    )
  }

  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 100), 1000) : 100

  const log = getAuditLog({
    limit,
    action: actionParam as AuditAction | undefined,
    actor: actorParam ?? undefined,
    since: sinceParam ?? undefined,
  })

  const stats = getAuditStats()

  return NextResponse.json(
    {
      ...log,
      stats: {
        actionCounts: stats.actionCounts,
        lastEntry: stats.lastEntry,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  )
}
