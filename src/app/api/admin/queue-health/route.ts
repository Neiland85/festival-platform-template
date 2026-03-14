/**
 * GET /api/admin/queue-health
 *
 * Expone salud de la burst queue: nivel, depth, drain rate, backpressure.
 * Protegido con requireAdmin.
 *
 * Response:
 * {
 *   level: "NORMAL"|"WARNING"|"CRITICAL"|"OVERFLOW",
 *   size, drainRate, ingestionRate, timeToDrain,
 *   backpressure, alerts: [...], history: [...]
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { checkQueueHealth } from "@/lib/observability/queueAlert"
import { queueSize } from "@/lib/security/burstQueue"

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 403 }
    )
  }

  const currentSize = queueSize()
  const health = checkQueueHealth(currentSize)

  return NextResponse.json(health, {
    headers: { "Cache-Control": "no-store" },
  })
}
