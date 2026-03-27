/**
 * Audit event repository — persistent audit log in PostgreSQL.
 *
 * Complements the in-memory ring buffer in auditLog.ts.
 * Writes are fire-and-forget (async, non-blocking) to avoid
 * adding latency to the request path.
 */

import { desc, eq, gte } from "drizzle-orm"
import { getDb } from "./drizzle"
import { auditEvents } from "./schema"

type AuditEventInput = {
  action: string
  actor: string
  ip: string
  resource: string
  details: Record<string, unknown>
  requestId: string
}

/**
 * Persist an audit event to PostgreSQL (fire-and-forget).
 * Failures are logged but never propagated — audit should not break the app.
 */
export function persistAuditEvent(event: AuditEventInput): void {
  const db = getDb()

  db.insert(auditEvents)
    .values({
      action: event.action,
      actor: event.actor,
      ip: event.ip,
      resource: event.resource,
      details: JSON.stringify(event.details),
      requestId: event.requestId,
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "audit_persist_failed",
          requestId: event.requestId,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    })
}

/**
 * Query persisted audit events with filters.
 */
export async function queryAuditEvents(options?: {
  limit?: number
  action?: string
  actor?: string
  since?: string
}) {
  const db = getDb()
  const limit = options?.limit ?? 100

  let query = db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit)
    .$dynamic()

  if (options?.action) {
    query = query.where(eq(auditEvents.action, options.action))
  }
  if (options?.actor) {
    query = query.where(eq(auditEvents.actor, options.actor))
  }
  if (options?.since) {
    query = query.where(gte(auditEvents.createdAt, new Date(options.since)))
  }

  return query
}
