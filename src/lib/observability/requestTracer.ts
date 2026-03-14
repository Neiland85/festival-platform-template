/**
 * M9: Request Tracing — x-request-id Propagation
 *
 * Sistema centralizado de trazabilidad por request.
 * Genera/propaga x-request-id, mide duración, y mantiene
 * un ring buffer de traces recientes para diagnóstico.
 *
 * Independiente — NO modifica ficheros existentes.
 * Serverless-compatible — estado en memoria.
 */

// ── Types ────────────────────────────────────────────────

export type TraceStatus = "active" | "completed" | "error"

export type TraceSpan = {
  name: string
  startedAt: number
  endedAt?: number
  durationMs?: number
  metadata?: Record<string, unknown>
}

export type TraceEntry = {
  requestId: string
  method: string
  path: string
  status: TraceStatus
  httpStatus?: number
  startedAt: number
  endedAt?: number
  durationMs?: number
  spans: TraceSpan[]
  metadata: Record<string, unknown>
  parentId?: string   // for sub-request correlation
}

export type TraceStats = {
  totalTraces: number
  activeTraces: number
  completedTraces: number
  errorTraces: number
  avgDurationMs: number
  p95DurationMs: number
  p99DurationMs: number
  slowestPaths: Array<{ path: string; avgMs: number; count: number }>
  collectedAt: string
}

// ── Config ───────────────────────────────────────────────

const MAX_TRACES = 500
const MAX_SPANS_PER_TRACE = 20
const SLOW_THRESHOLD_MS = 2000

// ── State ────────────────────────────────────────────────

const traces: TraceEntry[] = []
const activeTraces = new Map<string, TraceEntry>()
let totalCount = 0

// ── ID Generation ────────────────────────────────────────

let idCounter = 0

function generateRequestId(): string {
  idCounter++
  const ts = Date.now().toString(36)
  const seq = idCounter.toString(36).padStart(4, "0")
  const rand = Math.random().toString(36).slice(2, 6)
  return `req-${ts}-${seq}-${rand}`
}

// ── Helpers ──────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)] ?? 0
}

function logTrace(entry: TraceEntry, event: string): void {
  const log = {
    timestamp: new Date().toISOString(),
    level: "trace",
    event,
    requestId: entry.requestId,
    method: entry.method,
    path: entry.path,
    status: entry.status,
    httpStatus: entry.httpStatus,
    durationMs: entry.durationMs,
    spans: entry.spans.length,
    ...(entry.parentId ? { parentId: entry.parentId } : {}),
  }
  console.log(JSON.stringify(log))
}

// ── Public API ───────────────────────────────────────────

/**
 * Start tracing a request.
 * If incomingId is provided (from x-request-id header), it is reused;
 * otherwise a new ID is generated.
 *
 * Returns the requestId to propagate in response headers.
 */
export function startTrace(opts: {
  method: string
  path: string
  incomingId?: string
  parentId?: string
  metadata?: Record<string, unknown>
}): string {
  const requestId = opts.incomingId || generateRequestId()

  const entry: TraceEntry = {
    requestId,
    method: opts.method.toUpperCase(),
    path: opts.path,
    status: "active",
    startedAt: Date.now(),
    spans: [],
    metadata: opts.metadata ?? {},
    ...(opts.parentId ? { parentId: opts.parentId } : {}),
  }

  activeTraces.set(requestId, entry)
  totalCount++

  return requestId
}

/**
 * Add a span (sub-operation) to an active trace.
 * Useful for tracking DB queries, external API calls, etc.
 */
export function addSpan(requestId: string, span: {
  name: string
  metadata?: Record<string, unknown>
}): (() => void) {
  const entry = activeTraces.get(requestId)
  if (!entry) return () => {}

  const traceSpan: TraceSpan = {
    name: span.name,
    startedAt: Date.now(),
    metadata: span.metadata,
  }

  if (entry.spans.length < MAX_SPANS_PER_TRACE) {
    entry.spans.push(traceSpan)
  }

  // Return a function to end the span
  return () => {
    traceSpan.endedAt = Date.now()
    traceSpan.durationMs = traceSpan.endedAt - traceSpan.startedAt
  }
}

/**
 * End a trace (request completed).
 */
export function endTrace(requestId: string, opts?: {
  httpStatus?: number
  error?: boolean
  metadata?: Record<string, unknown>
}): TraceEntry | null {
  const entry = activeTraces.get(requestId)
  if (!entry) return null

  entry.endedAt = Date.now()
  entry.durationMs = entry.endedAt - entry.startedAt
  entry.httpStatus = opts?.httpStatus
  entry.status = opts?.error ? "error" : "completed"

  if (opts?.metadata) {
    Object.assign(entry.metadata, opts.metadata)
  }

  activeTraces.delete(requestId)

  // Push to ring buffer
  traces.push(entry)
  if (traces.length > MAX_TRACES) traces.shift()

  // Log slow requests or errors
  if (entry.status === "error" || (entry.durationMs ?? 0) > SLOW_THRESHOLD_MS) {
    logTrace(entry, entry.status === "error" ? "trace_error" : "trace_slow")
  }

  return entry
}

/**
 * Get a specific trace by requestId.
 */
export function getTrace(requestId: string): TraceEntry | undefined {
  return activeTraces.get(requestId) ?? traces.find(t => t.requestId === requestId)
}

/**
 * Get recent traces with optional filters.
 */
export function getRecentTraces(opts?: {
  limit?: number
  status?: TraceStatus
  path?: string
  minDurationMs?: number
}): TraceEntry[] {
  const limit = opts?.limit ?? 50
  let result = [...traces]

  if (opts?.status) {
    result = result.filter(t => t.status === opts.status)
  }
  if (opts?.path) {
    const pathFilter = opts.path
    result = result.filter(t => t.path.includes(pathFilter))
  }
  if (opts?.minDurationMs) {
    const minMs = opts.minDurationMs
    result = result.filter(t => (t.durationMs ?? 0) >= minMs)
  }

  return result.slice(-limit)
}

/**
 * Compute statistics from collected traces.
 */
export function getTraceStats(): TraceStats {
  const completed = traces.filter(t => t.status === "completed" || t.status === "error")
  const durations = completed
    .map(t => t.durationMs ?? 0)
    .sort((a, b) => a - b)

  // Per-path aggregation
  const pathMap = new Map<string, { totalMs: number; count: number }>()
  for (const t of completed) {
    const existing = pathMap.get(t.path)
    if (existing) {
      existing.totalMs += t.durationMs ?? 0
      existing.count++
    } else {
      pathMap.set(t.path, { totalMs: t.durationMs ?? 0, count: 1 })
    }
  }

  const slowestPaths = Array.from(pathMap.entries())
    .map(([path, data]) => ({
      path,
      avgMs: Math.round(data.totalMs / data.count),
      count: data.count,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10)

  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  return {
    totalTraces: totalCount,
    activeTraces: activeTraces.size,
    completedTraces: traces.filter(t => t.status === "completed").length,
    errorTraces: traces.filter(t => t.status === "error").length,
    avgDurationMs: avgDuration,
    p95DurationMs: Math.round(percentile(durations, 95)),
    p99DurationMs: Math.round(percentile(durations, 99)),
    slowestPaths,
    collectedAt: new Date().toISOString(),
  }
}

/**
 * Reset all state (for tests).
 */
export function resetTracer(): void {
  traces.length = 0
  activeTraces.clear()
  totalCount = 0
  idCounter = 0
}
