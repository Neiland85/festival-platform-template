/**
 * M6: Queue Depth Alert System
 *
 * Monitoriza la burst queue y emite alertas cuando la profundidad
 * excede thresholds o el drain rate es insuficiente.
 *
 * Niveles: NORMAL (<50) → WARNING (50-200) → CRITICAL (200-500) → OVERFLOW (>500)
 *
 * NO modifica burstQueue.ts. Lee queueSize() en modo read-only.
 *
 * Integración:
 *   import { checkQueueHealth } from "@/lib/observability/queueAlert"
 *   const health = checkQueueHealth(currentQueueSize)
 */

// ── Types ───────────────────────────────────────────────

export type QueueLevel = "NORMAL" | "WARNING" | "CRITICAL" | "OVERFLOW"

export type QueueHealthSnapshot = {
  level: QueueLevel
  size: number
  thresholds: { warning: number; critical: number; overflow: number }
  drainRate: number
  ingestionRate: number
  timeToDrain: string
  backpressure: boolean
  alerts: QueueAlert[]
  history: QueueSample[]
  checkedAt: string
}

export type QueueAlert = {
  level: "warn" | "error"
  code: string
  message: string
}

type QueueSample = {
  size: number
  timestamp: number
  drained: number
  ingested: number
}

// ── Config ──────────────────────────────────────────────

const THRESHOLD_WARNING = 50
const THRESHOLD_CRITICAL = 200
const THRESHOLD_OVERFLOW = 500
const MAX_HISTORY = 10
const BACKPRESSURE_THRESHOLD_MINUTES = 2

// ── Store ───────────────────────────────────────────────

let samples: QueueSample[] = []

// ── Public API ──────────────────────────────────────────

export function recordQueueSample(
  currentSize: number,
  justDrained: number = 0,
  justIngested: number = 0
): void {
  samples.push({
    size: currentSize,
    timestamp: Date.now(),
    drained: justDrained,
    ingested: justIngested,
  })

  if (samples.length > MAX_HISTORY) {
    samples = samples.slice(samples.length - MAX_HISTORY)
  }
}

export function checkQueueHealth(currentSize: number): QueueHealthSnapshot {
  const level = classifyLevel(currentSize)
  const alerts: QueueAlert[] = []
  const { drainRate, ingestionRate } = calculateRates()
  const timeToDrain = estimateTimeToDrain(currentSize, drainRate, ingestionRate)
  const backpressure = detectBackpressure()

  if (level === "WARNING") {
    alerts.push({
      level: "warn",
      code: "queue_depth_warning",
      message: `Queue depth at ${currentSize} (threshold: ${THRESHOLD_WARNING})`,
    })
  }

  if (level === "CRITICAL") {
    alerts.push({
      level: "error",
      code: "queue_depth_critical",
      message: `Queue depth CRITICAL at ${currentSize} — risk of lead loss`,
    })
  }

  if (level === "OVERFLOW") {
    alerts.push({
      level: "error",
      code: "queue_overflow",
      message: `Queue OVERFLOW at ${currentSize} — immediate intervention required`,
    })
  }

  if (backpressure) {
    alerts.push({
      level: "error",
      code: "queue_backpressure",
      message: `Drain rate (${drainRate.toFixed(1)}/min) < ingestion rate (${ingestionRate.toFixed(1)}/min) for >2 min`,
    })
  }

  if (drainRate === 0 && currentSize > 0) {
    alerts.push({
      level: "warn",
      code: "queue_drain_stalled",
      message: `Queue has ${currentSize} items but drain rate is 0 — daemon may be stopped`,
    })
  }

  for (const alert of alerts) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: alert.level,
        code: alert.code,
        message: alert.message,
        queueSize: currentSize,
        drainRate,
        ingestionRate,
      })
    )
  }

  return {
    level,
    size: currentSize,
    thresholds: {
      warning: THRESHOLD_WARNING,
      critical: THRESHOLD_CRITICAL,
      overflow: THRESHOLD_OVERFLOW,
    },
    drainRate: Math.round(drainRate * 10) / 10,
    ingestionRate: Math.round(ingestionRate * 10) / 10,
    timeToDrain,
    backpressure,
    alerts,
    history: [...samples],
    checkedAt: new Date().toISOString(),
  }
}

export function resetQueueAlert(): void {
  samples = []
}

// ── Internal ────────────────────────────────────────────

function classifyLevel(size: number): QueueLevel {
  if (size >= THRESHOLD_OVERFLOW) return "OVERFLOW"
  if (size >= THRESHOLD_CRITICAL) return "CRITICAL"
  if (size >= THRESHOLD_WARNING) return "WARNING"
  return "NORMAL"
}

function calculateRates(): { drainRate: number; ingestionRate: number } {
  if (samples.length < 2) {
    return { drainRate: 0, ingestionRate: 0 }
  }

  const first = samples[0]!
  const last = samples[samples.length - 1]!
  const elapsedMin = (last.timestamp - first.timestamp) / 60_000

  if (elapsedMin <= 0) return { drainRate: 0, ingestionRate: 0 }

  const totalDrainedInWindow = samples.reduce((sum, s) => sum + s.drained, 0)
  const totalIngestedInWindow = samples.reduce((sum, s) => sum + s.ingested, 0)

  return {
    drainRate: totalDrainedInWindow / elapsedMin,
    ingestionRate: totalIngestedInWindow / elapsedMin,
  }
}

function estimateTimeToDrain(
  currentSize: number,
  drainRate: number,
  ingestionRate: number
): string {
  if (currentSize === 0) return "0s"
  if (drainRate <= 0) return "∞"

  const netDrain = drainRate - ingestionRate
  if (netDrain <= 0) return "∞"

  const minutes = currentSize / netDrain
  if (minutes > 60) return `${Math.round(minutes)}m`

  const mins = Math.floor(minutes)
  const secs = Math.round((minutes - mins) * 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function detectBackpressure(): boolean {
  if (samples.length < 3) return false

  const last = samples[samples.length - 1]!
  const windowStart = last.timestamp - BACKPRESSURE_THRESHOLD_MINUTES * 60_000

  const recentSamples = samples.filter((s) => s.timestamp >= windowStart)
  if (recentSamples.length < 2) return false

  const totalDrainedRecent = recentSamples.reduce((sum, s) => sum + s.drained, 0)
  const totalIngestedRecent = recentSamples.reduce((sum, s) => sum + s.ingested, 0)

  return totalIngestedRecent > 0 && totalDrainedRecent < totalIngestedRecent
}
