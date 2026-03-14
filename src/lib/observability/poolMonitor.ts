/**
 * M7: DB Connection Pool Monitor
 *
 * Visibilidad sobre el pool de conexiones PostgreSQL (pg Pool).
 * Detecta pool exhaustion, conexiones colgadas y errores de conexión.
 *
 * NO modifica pool.ts. Lee stats en modo read-only via pool.totalCount, etc.
 *
 * Integración:
 *   import { getPoolHealth } from "@/lib/observability/poolMonitor"
 *   const health = getPoolHealth(pool)
 *
 * También puede registrar eventos via recordPoolEvent() para tracking histórico.
 */

// ── Types ───────────────────────────────────────────────

export type PoolLevel = "HEALTHY" | "PRESSURE" | "EXHAUSTED" | "ERROR"

export type PoolStats = {
  total: number          // totalCount — conexiones creadas
  idle: number           // idleCount — conexiones disponibles
  active: number         // total - idle
  waiting: number        // waitingCount — queries esperando conexión
  max: number            // max pool size configurado
}

export type PoolEvent = {
  type: "error" | "connect" | "acquire" | "release" | "waiting"
  timestamp: number
  message?: string
}

export type PoolHealthSnapshot = {
  level: PoolLevel
  stats: PoolStats
  utilization: string    // "60%" — active/max
  waitingAlert: boolean  // true si waiting > 0
  errors: number         // errores en últimos 60 min
  events: PoolEvent[]    // últimos N eventos
  alerts: PoolAlert[]
  checkedAt: string
}

export type PoolAlert = {
  level: "warn" | "error"
  code: string
  message: string
}

// ── Minimal Pool interface (for testing without real pg) ──

export interface PoolLike {
  totalCount: number
  idleCount: number
  waitingCount: number
  options?: { max?: number }
}

// ── Config ──────────────────────────────────────────────

const MAX_EVENTS = 100
const ERROR_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const DEFAULT_MAX_POOL = 5

// ── Store ───────────────────────────────────────────────

let events: PoolEvent[] = []

// ── Public API ──────────────────────────────────────────

/**
 * Registra un evento del pool (error, connect, acquire, release, waiting).
 * Llamar desde hooks del pool: pool.on('error', ...), pool.on('connect', ...).
 */
export function recordPoolEvent(
  type: PoolEvent["type"],
  message?: string
): void {
  events.push({
    type,
    timestamp: Date.now(),
    message,
  })

  if (events.length > MAX_EVENTS) {
    events = events.slice(events.length - MAX_EVENTS)
  }

  // Structured log for errors
  if (type === "error") {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        code: "pool_connection_error",
        message: message ?? "Unknown pool error",
      })
    )
  }
}

/**
 * Evalúa la salud del pool de conexiones.
 *
 * @param pool - pg Pool instance (o PoolLike para testing)
 */
export function getPoolHealth(pool: PoolLike): PoolHealthSnapshot {
  const max = pool.options?.max ?? DEFAULT_MAX_POOL
  const stats: PoolStats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    active: pool.totalCount - pool.idleCount,
    waiting: pool.waitingCount,
    max,
  }

  const utilization = max > 0
    ? ((stats.active / max) * 100).toFixed(0) + "%"
    : "0%"

  const level = classifyPoolLevel(stats)
  const alerts: PoolAlert[] = []
  const waitingAlert = stats.waiting > 0

  // Errores en última hora
  const errorCutoff = Date.now() - ERROR_WINDOW_MS
  const recentErrors = events.filter(
    (e) => e.type === "error" && e.timestamp >= errorCutoff
  ).length

  // Alertas
  if (level === "EXHAUSTED") {
    alerts.push({
      level: "error",
      code: "pool_exhausted",
      message: `All ${max} connections in use, ${stats.waiting} queries waiting`,
    })
  }

  if (level === "PRESSURE") {
    alerts.push({
      level: "warn",
      code: "pool_pressure",
      message: `Pool at ${utilization} utilization (${stats.active}/${max} active)`,
    })
  }

  if (waitingAlert) {
    alerts.push({
      level: "error",
      code: "pool_waiting",
      message: `${stats.waiting} queries waiting for connection — possible pool exhaustion`,
    })
  }

  if (recentErrors > 0) {
    alerts.push({
      level: "warn",
      code: "pool_errors",
      message: `${recentErrors} connection errors in last hour`,
    })
  }

  // Log alerts
  for (const alert of alerts) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: alert.level,
        code: alert.code,
        message: alert.message,
        poolStats: stats,
      })
    )
  }

  return {
    level,
    stats,
    utilization,
    waitingAlert,
    errors: recentErrors,
    events: [...events].slice(-20), // last 20 events
    alerts,
    checkedAt: new Date().toISOString(),
  }
}

/**
 * Reset (para tests).
 */
export function resetPoolMonitor(): void {
  events = []
}

// ── Internal ────────────────────────────────────────────

function classifyPoolLevel(stats: PoolStats): PoolLevel {
  // Waiting queries = exhausted
  if (stats.waiting > 0) return "EXHAUSTED"

  // All connections in use = pressure
  if (stats.active >= stats.max) return "PRESSURE"

  // >80% utilization = pressure
  if (stats.max > 0 && stats.active / stats.max >= 0.8) return "PRESSURE"

  return "HEALTHY"
}
