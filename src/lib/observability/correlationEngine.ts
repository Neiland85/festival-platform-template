/**
 * M8: Analytics Correlation Engine
 *
 * Correlaciona señales de todos los módulos de observabilidad (M1-M7)
 * para generar un índice de salud unificado del sistema y detectar
 * patrones de degradación cruzados.
 *
 * Independiente — NO modifica ficheros existentes.
 * Serverless-compatible — estado en memoria, sin dependencias externas.
 */

// ── Types ────────────────────────────────────────────────

export type SignalSource =
  | "metrics"     // M1
  | "audit"       // M2
  | "surge"       // M3
  | "cache"       // M4
  | "seo"         // M5
  | "queue"       // M6
  | "pool"        // M7

export type HealthLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED"

export type SignalInput = {
  source: SignalSource
  level: HealthLevel
  score: number          // 0–100 (100 = perfect health)
  details?: string
  timestamp?: number
}

export type CorrelationAlert = {
  id: string
  pattern: string
  severity: HealthLevel
  sources: SignalSource[]
  message: string
  detectedAt: string
}

export type HealthTimeline = {
  timestamp: number
  overallScore: number
  level: HealthLevel
  signals: Map<SignalSource, number>
}

export type CorrelationReport = {
  overallScore: number
  overallLevel: HealthLevel
  signalScores: Record<SignalSource, number | null>
  alerts: CorrelationAlert[]
  trend: "improving" | "stable" | "degrading"
  timeline: Array<{ timestamp: number; score: number; level: HealthLevel }>
  correlations: Array<{
    sources: [SignalSource, SignalSource]
    coefficient: number
    interpretation: string
  }>
  collectedAt: string
}

// ── Config ───────────────────────────────────────────────

const MAX_TIMELINE = 120          // ~2h at 1 sample/min
const ALERT_RING_SIZE = 50

const WEIGHTS: Record<SignalSource, number> = {
  metrics: 0.20,
  audit: 0.05,
  surge: 0.15,
  cache: 0.15,
  seo: 0.05,
  queue: 0.20,
  pool: 0.20,
}

const LEVEL_THRESHOLDS = {
  GREEN:  80,
  YELLOW: 60,
  ORANGE: 40,
  // below 40 → RED
} as const

// ── State ────────────────────────────────────────────────

const latestSignals = new Map<SignalSource, SignalInput>()
const timeline: HealthTimeline[] = []
const alerts: CorrelationAlert[] = []
let alertSeq = 0

// ── Helpers ──────────────────────────────────────────────

function scoreToLevel(score: number): HealthLevel {
  if (score >= LEVEL_THRESHOLDS.GREEN) return "GREEN"
  if (score >= LEVEL_THRESHOLDS.YELLOW) return "YELLOW"
  if (score >= LEVEL_THRESHOLDS.ORANGE) return "ORANGE"
  return "RED"
}

function generateAlertId(): string {
  alertSeq++
  return `corr-${Date.now().toString(36)}-${alertSeq}`
}

function pushAlert(alert: CorrelationAlert): void {
  alerts.push(alert)
  if (alerts.length > ALERT_RING_SIZE) alerts.shift()
  // Structured log to stdout
  const log = {
    timestamp: new Date().toISOString(),
    level: "correlation_alert",
    alertId: alert.id,
    pattern: alert.pattern,
    severity: alert.severity,
    sources: alert.sources,
    message: alert.message,
  }
  console.log(JSON.stringify(log))
}

// ── Correlation patterns ─────────────────────────────────

type PatternDetector = (signals: Map<SignalSource, SignalInput>) => CorrelationAlert | null

const PATTERNS: PatternDetector[] = [
  // Pattern 1: Queue + Pool simultaneous degradation → backpressure cascade
  (signals) => {
    const q = signals.get("queue")
    const p = signals.get("pool")
    if (!q || !p) return null
    if (q.score < 50 && p.score < 50) {
      return {
        id: generateAlertId(),
        pattern: "backpressure_cascade",
        severity: "RED",
        sources: ["queue", "pool"],
        message: `Queue (${q.score}) and pool (${p.score}) degraded simultaneously — likely backpressure cascade`,
        detectedAt: new Date().toISOString(),
      }
    }
    return null
  },

  // Pattern 2: Surge + Queue pressure → traffic overload
  (signals) => {
    const s = signals.get("surge")
    const q = signals.get("queue")
    if (!s || !q) return null
    if (s.score < 60 && q.score < 60) {
      return {
        id: generateAlertId(),
        pattern: "traffic_overload",
        severity: "ORANGE",
        sources: ["surge", "queue"],
        message: `Surge warning (${s.score}) with queue pressure (${q.score}) — traffic exceeding capacity`,
        detectedAt: new Date().toISOString(),
      }
    }
    return null
  },

  // Pattern 3: Metrics errors + Pool degradation → infrastructure failure
  (signals) => {
    const m = signals.get("metrics")
    const p = signals.get("pool")
    if (!m || !p) return null
    if (m.score < 50 && p.score < 50) {
      return {
        id: generateAlertId(),
        pattern: "infra_failure",
        severity: "RED",
        sources: ["metrics", "pool"],
        message: `High error rate (metrics: ${m.score}) with pool issues (${p.score}) — infrastructure failure`,
        detectedAt: new Date().toISOString(),
      }
    }
    return null
  },

  // Pattern 4: Cache miss storm + Metrics latency → cold cache impact
  (signals) => {
    const c = signals.get("cache")
    const m = signals.get("metrics")
    if (!c || !m) return null
    if (c.score < 50 && m.score < 70) {
      return {
        id: generateAlertId(),
        pattern: "cache_miss_storm",
        severity: "ORANGE",
        sources: ["cache", "metrics"],
        message: `Cache degraded (${c.score}) impacting latency (metrics: ${m.score}) — possible cold cache storm`,
        detectedAt: new Date().toISOString(),
      }
    }
    return null
  },

  // Pattern 5: ≥3 signals below YELLOW → systemic degradation
  (signals) => {
    const degraded = Array.from(signals.entries())
      .filter(([, s]) => s.score < LEVEL_THRESHOLDS.YELLOW)
      .map(([src]) => src)
    if (degraded.length >= 3) {
      return {
        id: generateAlertId(),
        pattern: "systemic_degradation",
        severity: "RED",
        sources: degraded,
        message: `${degraded.length} signals below YELLOW threshold: ${degraded.join(", ")} — systemic degradation`,
        detectedAt: new Date().toISOString(),
      }
    }
    return null
  },
]

// ── Pearson correlation ──────────────────────────────────

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 3) return 0
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX
    const dy = (ys[i] ?? 0) - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  return den === 0 ? 0 : num / den
}

function interpretCorrelation(r: number): string {
  const abs = Math.abs(r)
  if (abs < 0.3) return "weak"
  if (abs < 0.7) return r > 0 ? "moderate positive" : "moderate negative"
  return r > 0 ? "strong positive" : "strong negative"
}

// ── Public API ───────────────────────────────────────────

/**
 * Ingest a health signal from any module.
 * Call this periodically (e.g. every minute) to feed the correlation engine.
 */
export function ingestSignal(input: SignalInput): void {
  const signal: SignalInput = {
    ...input,
    score: Math.max(0, Math.min(100, input.score)),
    timestamp: input.timestamp ?? Date.now(),
  }
  latestSignals.set(input.source, signal)
}

/**
 * Run correlation analysis on current signals and update timeline.
 * Returns the full correlation report.
 */
export function correlate(): CorrelationReport {
  const now = Date.now()

  // ── Weighted overall score ────────────────────────────
  let totalWeight = 0
  let weightedSum = 0

  const signalScores: Record<string, number | null> = {
    metrics: null, audit: null, surge: null,
    cache: null, seo: null, queue: null, pool: null,
  }

  for (const [source, signal] of latestSignals) {
    const w = WEIGHTS[source]
    weightedSum += signal.score * w
    totalWeight += w
    signalScores[source] = signal.score
  }

  const overallScore = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 100  // no signals = assume healthy
  const overallLevel = scoreToLevel(overallScore)

  // ── Timeline snapshot ─────────────────────────────────
  const signalsMap = new Map<SignalSource, number>()
  for (const [src, sig] of latestSignals) signalsMap.set(src, sig.score)

  const snapshot: HealthTimeline = {
    timestamp: now,
    overallScore,
    level: overallLevel,
    signals: signalsMap,
  }
  timeline.push(snapshot)
  if (timeline.length > MAX_TIMELINE) timeline.shift()

  // ── Detect correlation patterns ───────────────────────
  const newAlerts: CorrelationAlert[] = []
  for (const detect of PATTERNS) {
    const alert = detect(latestSignals)
    if (alert) {
      pushAlert(alert)
      newAlerts.push(alert)
    }
  }

  // ── Trend calculation ─────────────────────────────────
  let trend: "improving" | "stable" | "degrading" = "stable"
  if (timeline.length >= 3) {
    const recent = timeline.slice(-5)
    const first = recent[0]?.overallScore ?? overallScore
    const last = recent[recent.length - 1]?.overallScore ?? overallScore
    const delta = last - first
    if (delta > 5) trend = "improving"
    else if (delta < -5) trend = "degrading"
  }

  // ── Cross-signal correlations ─────────────────────────
  const correlations: CorrelationReport["correlations"] = []
  if (timeline.length >= 5) {
    const sources = Array.from(latestSignals.keys())
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const srcA = sources[i]!
        const srcB = sources[j]!
        const seriesA: number[] = []
        const seriesB: number[] = []
        for (const t of timeline) {
          const a = t.signals.get(srcA)
          const b = t.signals.get(srcB)
          if (a !== undefined && b !== undefined) {
            seriesA.push(a)
            seriesB.push(b)
          }
        }
        if (seriesA.length >= 3) {
          const r = pearson(seriesA, seriesB)
          correlations.push({
            sources: [srcA, srcB],
            coefficient: Math.round(r * 1000) / 1000,
            interpretation: interpretCorrelation(r),
          })
        }
      }
    }
  }

  return {
    overallScore,
    overallLevel,
    signalScores: signalScores as Record<SignalSource, number | null>,
    alerts: [...alerts],
    trend,
    timeline: timeline.map(t => ({
      timestamp: t.timestamp,
      score: t.overallScore,
      level: t.level,
    })),
    correlations,
    collectedAt: new Date().toISOString(),
  }
}

/**
 * Get latest alerts without running full correlation.
 */
export function getAlerts(): CorrelationAlert[] {
  return [...alerts]
}

/**
 * Get the timeline history.
 */
export function getTimeline(): Array<{ timestamp: number; score: number; level: HealthLevel }> {
  return timeline.map(t => ({
    timestamp: t.timestamp,
    score: t.overallScore,
    level: t.level,
  }))
}

/**
 * Reset all state (for tests).
 */
export function resetCorrelation(): void {
  latestSignals.clear()
  timeline.length = 0
  alerts.length = 0
  alertSeq = 0
}
