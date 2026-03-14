/**
 * M2: Structured Audit Logger
 *
 * Trail de auditoría estructurado para acciones admin.
 * Captura: quién, cuándo, qué, desde dónde, y qué cambió.
 *
 * Formato: JSON estructurado en stdout (compatible con CloudWatch, Loki, Datadog).
 * Persistencia: in-memory ring buffer para consulta vía endpoint + stdout para log shipping.
 *
 * NO modifica lógica de rutas existentes. Se integra con una sola línea:
 *   audit({ action: "leads.export", actor: "admin", ip, resource: "leads", details: { count: 42 } })
 *
 * GDPR: Permite trazabilidad de acceso a PII (lead emails).
 */

import { NextRequest } from "next/server"

// ── Types ───────────────────────────────────────────────

export type AuditAction =
  | "admin.login"
  | "admin.login_failed"
  | "admin.logout"
  | "event.create"
  | "event.update"
  | "event.delete"
  | "leads.view"
  | "leads.export"
  | "leads.delete"
  | "system.config_change"
  | "system.queue_drain"
  | "system.metrics_reset"

export type AuditEntry = {
  timestamp: string
  level: "audit"
  action: AuditAction
  actor: string
  ip: string
  resource: string
  details: Record<string, unknown>
  requestId: string
  seq: number
}

export type AuditLogParams = {
  action: AuditAction
  actor?: string
  ip?: string
  resource?: string
  details?: Record<string, unknown>
  req?: NextRequest
}

// ── Config ──────────────────────────────────────────────

const MAX_ENTRIES = 1000
const LOG_TO_STDOUT = true

// ── Store (ring buffer) ─────────────────────────────────

let buffer: AuditEntry[] = []
let writeIndex = 0
let totalCount = 0

// ── Helpers ─────────────────────────────────────────────

function generateRequestId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `aud-${ts}-${rand}`
}

function extractIp(req?: NextRequest): string {
  if (!req) return "unknown"

  const realIp = req.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }

  return "unknown"
}

function extractActor(req?: NextRequest): string {
  if (!req) return "system"
  // En el sistema actual, el actor es "admin" si tiene cookie válida
  const hasCookie = req.cookies.get("admin_session")?.value
  return hasCookie ? "admin" : "anonymous"
}

// ── Public API ──────────────────────────────────────────

/**
 * Registra un evento de auditoría.
 *
 * Escribe en stdout (JSON) y almacena en ring buffer in-memory.
 *
 * Uso mínimo:
 *   audit({ action: "leads.export", req })
 *
 * Uso completo:
 *   audit({ action: "event.delete", actor: "admin", ip: "1.2.3.4", resource: "evt-123", details: { reason: "duplicate" } })
 */
export function audit(params: AuditLogParams): AuditEntry {
  const {
    action,
    actor,
    ip,
    resource = "-",
    details = {},
    req,
  } = params

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    level: "audit",
    action,
    actor: actor ?? extractActor(req),
    ip: ip ?? extractIp(req),
    resource,
    details,
    requestId: generateRequestId(),
    seq: totalCount,
  }

  // Stdout (structured JSON — parseable por log shippers)
  if (LOG_TO_STDOUT) {
    console.log(JSON.stringify(entry))
  }

  // Ring buffer
  if (buffer.length < MAX_ENTRIES) {
    buffer.push(entry)
  } else {
    buffer[writeIndex % MAX_ENTRIES] = entry
  }
  writeIndex++
  totalCount++

  return entry
}

/**
 * Devuelve las últimas N entradas de auditoría (más recientes primero).
 */
export function getAuditLog(options?: {
  limit?: number
  action?: AuditAction
  actor?: string
  since?: string
}): { entries: AuditEntry[]; total: number; bufferSize: number } {
  const limit = options?.limit ?? 100
  const actionFilter = options?.action
  const actorFilter = options?.actor
  const sinceFilter = options?.since ? new Date(options.since).getTime() : 0

  let entries = [...buffer]

  // Filtros
  if (actionFilter) {
    entries = entries.filter((e) => e.action === actionFilter)
  }
  if (actorFilter) {
    entries = entries.filter((e) => e.actor === actorFilter)
  }
  if (sinceFilter > 0) {
    entries = entries.filter(
      (e) => new Date(e.timestamp).getTime() >= sinceFilter
    )
  }

  // Orden: más reciente primero (seq como desempate estable)
  entries.sort((a, b) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    return timeDiff !== 0 ? timeDiff : b.seq - a.seq
  })

  return {
    entries: entries.slice(0, limit),
    total: totalCount,
    bufferSize: buffer.length,
  }
}

/**
 * Resetea el buffer. Uso: tests.
 */
export function resetAuditLog(): void {
  buffer = []
  writeIndex = 0
  totalCount = 0
}

/**
 * Estadísticas rápidas del audit log.
 */
export function getAuditStats(): {
  total: number
  bufferSize: number
  actionCounts: Record<string, number>
  lastEntry: AuditEntry | null
} {
  const actionCounts: Record<string, number> = {}
  for (const entry of buffer) {
    actionCounts[entry.action] = (actionCounts[entry.action] ?? 0) + 1
  }

  return {
    total: totalCount,
    bufferSize: buffer.length,
    actionCounts,
    lastEntry: buffer.length > 0 ? buffer[buffer.length - 1]! : null,
  }
}
