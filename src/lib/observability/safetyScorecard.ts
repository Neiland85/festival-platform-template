/**
 * M10: Infrastructure Safety Scorecard
 *
 * Genera un scorecard ejecutivo que evalúa la salud integral
 * de la infraestructura combinando checks independientes de
 * cada dimensión: latencia, errores, pool, colas, caché, SEO,
 * trazabilidad y correlación.
 *
 * Diseñado para consumo humano (dashboards, alertas ejecutivas)
 * y máquina (JSON estructurado, umbrales configurables).
 *
 * Independiente — NO modifica ficheros existentes.
 * Serverless-compatible — puro cómputo, sin estado propio.
 */

// ── Types ────────────────────────────────────────────────

export type DimensionId =
  | "latency"
  | "error_rate"
  | "pool"
  | "queue"
  | "cache"
  | "seo"
  | "tracing"
  | "correlation"
  | "audit"

export type Grade = "A" | "B" | "C" | "D" | "F"

export type DimensionResult = {
  id: DimensionId
  name: string
  score: number        // 0–100
  grade: Grade
  status: "pass" | "warn" | "fail"
  details: string
  checks: Array<{
    name: string
    passed: boolean
    value: string
    threshold: string
  }>
}

export type ScorecardReport = {
  overallScore: number
  overallGrade: Grade
  dimensions: DimensionResult[]
  passing: number
  warning: number
  failing: number
  generatedAt: string
  recommendation: string
}

// ── Inputs (pure data, no module imports) ────────────────

export type MetricsInput = {
  totalRequests: number
  totalErrors: number
  routes: Array<{
    route: string
    p95: number
    p99: number
    errorRate: string
    requests: number
  }>
}

export type PoolInput = {
  level: string
  stats: { total: number; idle: number; active: number; waiting: number; max: number }
  utilization: string
  errors: Array<{ type: string }>
}

export type QueueInput = {
  level: string
  currentSize: number
  alerts: Array<{ type: string }>
}

export type CacheInput = {
  hits: number
  misses: number
  staleHits: number
  size: number
}

export type SEOInput = {
  score: number
  grade: string
  issues: Array<{ severity: string }>
}

export type TracingInput = {
  totalTraces: number
  activeTraces: number
  errorTraces: number
  avgDurationMs: number
  p95DurationMs: number
}

export type CorrelationInput = {
  overallScore: number
  overallLevel: string
  alerts: Array<{ severity: string }>
  trend: string
}

export type AuditInput = {
  totalEntries: number
  actionBreakdown: Record<string, number>
}

export type ScorecardInput = {
  metrics?: MetricsInput
  pool?: PoolInput
  queue?: QueueInput
  cache?: CacheInput
  seo?: SEOInput
  tracing?: TracingInput
  correlation?: CorrelationInput
  audit?: AuditInput
}

// ── Helpers ──────────────────────────────────────────────

function scoreToGrade(score: number): Grade {
  if (score >= 90) return "A"
  if (score >= 75) return "B"
  if (score >= 60) return "C"
  if (score >= 40) return "D"
  return "F"
}

function scoreToStatus(score: number): "pass" | "warn" | "fail" {
  if (score >= 75) return "pass"
  if (score >= 50) return "warn"
  return "fail"
}

function check(name: string, passed: boolean, value: string, threshold: string) {
  return { name, passed, value, threshold }
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 10000) / 100
}

// ── Dimension evaluators ─────────────────────────────────

function evalLatency(m: MetricsInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  // Check: global p95 < 500ms
  const p95s = m.routes.map(r => r.p95)
  const maxP95 = p95s.length > 0 ? Math.max(...p95s) : 0
  const p95Pass = maxP95 < 500
  checks_list.push(check("Max route P95 < 500ms", p95Pass, `${maxP95}ms`, "<500ms"))
  if (!p95Pass) score -= 30

  // Check: global p99 < 1000ms
  const p99s = m.routes.map(r => r.p99)
  const maxP99 = p99s.length > 0 ? Math.max(...p99s) : 0
  const p99Pass = maxP99 < 1000
  checks_list.push(check("Max route P99 < 1000ms", p99Pass, `${maxP99}ms`, "<1000ms"))
  if (!p99Pass) score -= 30

  // Check: has sufficient traffic for meaningful data
  const trafficPass = m.totalRequests >= 10
  checks_list.push(check("Sufficient traffic (≥10 req)", trafficPass, `${m.totalRequests}`, "≥10"))
  if (!trafficPass) score -= 10

  return {
    id: "latency",
    name: "Request Latency",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Max P95: ${maxP95}ms, Max P99: ${maxP99}ms across ${m.routes.length} routes`,
    checks: checks_list,
  }
}

function evalErrorRate(m: MetricsInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  const globalRate = pct(m.totalErrors, m.totalRequests)
  const ratePass = globalRate < 5
  checks_list.push(check("Global error rate < 5%", ratePass, `${globalRate}%`, "<5%"))
  if (!ratePass) score -= 40

  const criticalRate = globalRate < 1
  checks_list.push(check("Global error rate < 1%", criticalRate, `${globalRate}%`, "<1%"))
  if (!criticalRate) score -= 20

  // Check per-route: any route >10% error rate
  const hotRoutes = m.routes.filter(r => parseFloat(r.errorRate) > 10)
  const noHotRoutes = hotRoutes.length === 0
  checks_list.push(check("No route >10% errors", noHotRoutes, `${hotRoutes.length} routes`, "0"))
  if (!noHotRoutes) score -= 20

  return {
    id: "error_rate",
    name: "Error Rate",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Global error rate: ${globalRate}%, ${hotRoutes.length} hot routes`,
    checks: checks_list,
  }
}

function evalPool(p: PoolInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  const levelPass = p.level === "HEALTHY"
  checks_list.push(check("Pool level is HEALTHY", levelPass, p.level, "HEALTHY"))
  if (!levelPass) score -= p.level === "EXHAUSTED" || p.level === "ERROR" ? 50 : 25

  const util = parseFloat(p.utilization)
  const utilPass = util < 80
  checks_list.push(check("Utilization < 80%", utilPass, `${util}%`, "<80%"))
  if (!utilPass) score -= 20

  const waitPass = p.stats.waiting === 0
  checks_list.push(check("No waiting queries", waitPass, `${p.stats.waiting}`, "0"))
  if (!waitPass) score -= 15

  const errPass = p.errors.length === 0
  checks_list.push(check("No recent pool errors", errPass, `${p.errors.length}`, "0"))
  if (!errPass) score -= 15

  return {
    id: "pool",
    name: "DB Connection Pool",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Level: ${p.level}, Util: ${p.utilization}, Waiting: ${p.stats.waiting}`,
    checks: checks_list,
  }
}

function evalQueue(q: QueueInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  const levelPass = q.level === "NORMAL"
  checks_list.push(check("Queue level is NORMAL", levelPass, q.level, "NORMAL"))
  if (!levelPass) score -= q.level === "OVERFLOW" || q.level === "CRITICAL" ? 50 : 25

  const sizePass = q.currentSize < 100
  checks_list.push(check("Queue size < 100", sizePass, `${q.currentSize}`, "<100"))
  if (!sizePass) score -= 20

  const alertPass = q.alerts.length === 0
  checks_list.push(check("No active queue alerts", alertPass, `${q.alerts.length}`, "0"))
  if (!alertPass) score -= 15

  return {
    id: "queue",
    name: "Queue Health",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Level: ${q.level}, Size: ${q.currentSize}, Alerts: ${q.alerts.length}`,
    checks: checks_list,
  }
}

function evalCache(c: CacheInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  const total = c.hits + c.misses + c.staleHits
  const hitRate = total > 0 ? pct(c.hits + c.staleHits, total) : 100
  const hitPass = hitRate >= 70
  checks_list.push(check("Cache hit rate ≥ 70%", hitPass, `${hitRate}%`, "≥70%"))
  if (!hitPass) score -= 30

  const staleRate = total > 0 ? pct(c.staleHits, total) : 0
  const stalePass = staleRate < 30
  checks_list.push(check("Stale hit rate < 30%", stalePass, `${staleRate}%`, "<30%"))
  if (!stalePass) score -= 20

  const hasTraficPass = total >= 5
  checks_list.push(check("Sufficient cache traffic (≥5)", hasTraficPass, `${total}`, "≥5"))
  if (!hasTraficPass) score -= 10

  return {
    id: "cache",
    name: "Cache Efficiency",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Hit rate: ${hitRate}%, Stale: ${staleRate}%, Size: ${c.size}`,
    checks: checks_list,
  }
}

function evalSEO(s: SEOInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = s.score

  const gradePass = s.grade === "A" || s.grade === "B"
  checks_list.push(check("SEO grade A or B", gradePass, s.grade, "A or B"))

  const errorIssues = s.issues.filter(i => i.severity === "error")
  const noErrors = errorIssues.length === 0
  checks_list.push(check("No SEO errors", noErrors, `${errorIssues.length}`, "0"))
  if (!noErrors) score = Math.min(score, 50)

  const warningIssues = s.issues.filter(i => i.severity === "warning")
  const fewWarnings = warningIssues.length <= 2
  checks_list.push(check("≤2 SEO warnings", fewWarnings, `${warningIssues.length}`, "≤2"))

  return {
    id: "seo",
    name: "SEO Health",
    score: Math.max(0, Math.min(100, score)),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Score: ${s.score}, Grade: ${s.grade}, Errors: ${errorIssues.length}, Warnings: ${warningIssues.length}`,
    checks: checks_list,
  }
}

function evalTracing(t: TracingInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  // Active tracing
  const hasTracing = t.totalTraces > 0
  checks_list.push(check("Tracing active (>0 traces)", hasTracing, `${t.totalTraces}`, ">0"))
  if (!hasTracing) score -= 30

  // Error rate
  const errRate = t.totalTraces > 0 ? pct(t.errorTraces, t.totalTraces) : 0
  const errPass = errRate < 5
  checks_list.push(check("Trace error rate < 5%", errPass, `${errRate}%`, "<5%"))
  if (!errPass) score -= 30

  // P95 latency
  const p95Pass = t.p95DurationMs < 2000
  checks_list.push(check("P95 trace duration < 2s", p95Pass, `${t.p95DurationMs}ms`, "<2000ms"))
  if (!p95Pass) score -= 20

  // No orphan active traces
  const orphanPass = t.activeTraces < 10
  checks_list.push(check("Active traces < 10 (no leaks)", orphanPass, `${t.activeTraces}`, "<10"))
  if (!orphanPass) score -= 15

  return {
    id: "tracing",
    name: "Request Tracing",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Total: ${t.totalTraces}, Errors: ${t.errorTraces}, P95: ${t.p95DurationMs}ms, Active: ${t.activeTraces}`,
    checks: checks_list,
  }
}

function evalCorrelation(c: CorrelationInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = c.overallScore

  const levelPass = c.overallLevel === "GREEN"
  checks_list.push(check("Correlation level is GREEN", levelPass, c.overallLevel, "GREEN"))

  const trendPass = c.trend !== "degrading"
  checks_list.push(check("Trend not degrading", trendPass, c.trend, "≠degrading"))
  if (!trendPass) score -= 15

  const redAlerts = c.alerts.filter(a => a.severity === "RED")
  const noRedPass = redAlerts.length === 0
  checks_list.push(check("No RED correlation alerts", noRedPass, `${redAlerts.length}`, "0"))
  if (!noRedPass) score -= 20

  return {
    id: "correlation",
    name: "Cross-Signal Correlation",
    score: Math.max(0, Math.min(100, score)),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Level: ${c.overallLevel}, Trend: ${c.trend}, RED alerts: ${redAlerts.length}`,
    checks: checks_list,
  }
}

function evalAudit(a: AuditInput): DimensionResult {
  const checks_list: DimensionResult["checks"] = []
  let score = 100

  const hasLogs = a.totalEntries > 0
  checks_list.push(check("Audit logging active", hasLogs, `${a.totalEntries} entries`, ">0"))
  if (!hasLogs) score -= 30

  const actionTypes = Object.keys(a.actionBreakdown).length
  const diverseActions = actionTypes >= 3
  checks_list.push(check("≥3 distinct action types", diverseActions, `${actionTypes}`, "≥3"))
  if (!diverseActions) score -= 15

  return {
    id: "audit",
    name: "Audit Trail",
    score: Math.max(0, score),
    grade: scoreToGrade(Math.max(0, score)),
    status: scoreToStatus(Math.max(0, score)),
    details: `Entries: ${a.totalEntries}, Action types: ${actionTypes}`,
    checks: checks_list,
  }
}

// ── Main API ─────────────────────────────────────────────

/**
 * Generate the full infrastructure safety scorecard.
 * Accepts pre-collected data from each module (pure function, no side effects).
 */
export function generateScorecard(input: ScorecardInput): ScorecardReport {
  const dimensions: DimensionResult[] = []

  if (input.metrics) {
    dimensions.push(evalLatency(input.metrics))
    dimensions.push(evalErrorRate(input.metrics))
  }
  if (input.pool) dimensions.push(evalPool(input.pool))
  if (input.queue) dimensions.push(evalQueue(input.queue))
  if (input.cache) dimensions.push(evalCache(input.cache))
  if (input.seo) dimensions.push(evalSEO(input.seo))
  if (input.tracing) dimensions.push(evalTracing(input.tracing))
  if (input.correlation) dimensions.push(evalCorrelation(input.correlation))
  if (input.audit) dimensions.push(evalAudit(input.audit))

  const scores = dimensions.map(d => d.score)
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 100

  const passing = dimensions.filter(d => d.status === "pass").length
  const warning = dimensions.filter(d => d.status === "warn").length
  const failing = dimensions.filter(d => d.status === "fail").length

  // Generate recommendation
  let recommendation: string
  if (failing > 0) {
    const failDims = dimensions.filter(d => d.status === "fail").map(d => d.name)
    recommendation = `CRITICAL: ${failing} dimension(s) failing — focus on: ${failDims.join(", ")}`
  } else if (warning > 0) {
    const warnDims = dimensions.filter(d => d.status === "warn").map(d => d.name)
    recommendation = `WARNING: ${warning} dimension(s) need attention — review: ${warnDims.join(", ")}`
  } else if (dimensions.length === 0) {
    recommendation = "No data available — ensure observability modules are active"
  } else {
    recommendation = "All systems nominal — continue monitoring"
  }

  return {
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    dimensions,
    passing,
    warning,
    failing,
    generatedAt: new Date().toISOString(),
    recommendation,
  }
}
