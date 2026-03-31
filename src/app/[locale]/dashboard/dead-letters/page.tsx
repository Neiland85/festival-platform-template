"use client"

import { useEffect, useState, useCallback } from "react"

// ── Types ───────────────────────────────────────────────

type DeadLetter = {
  id: string
  provider: string
  eventType: string
  eventId: string
  error: string
  attempts: number
  resolvedAt: string | null
  createdAt: string
  status?: string
  decision?: {
    severity: string
    action: string
    autoRetry: boolean
    reason: string
  }
}

type TimelineEvent = {
  timestamp: string
  type: string
  source: "db" | "inferred"
  message: string
  severity: "info" | "warn" | "error"
  meta?: Record<string, unknown>
}

type TimelineData = {
  correlationId: string
  eventType: string
  provider: string
  totalEntries: number
  timeline: TimelineEvent[]
}

type ActionState = { id: string; action: "resolve" | "retry"; status: "pending" | "ok" | "error"; message?: string }

// ── API helpers ─────────────────────────────────────────

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}

async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf")
  if (!res.ok) throw new Error("Failed to fetch CSRF token")
  const data = await res.json()
  return data.csrfToken
}

async function postAction(id: string, action: "resolve" | "retry"): Promise<{ ok: boolean; error?: string }> {
  const csrfToken = await getCsrfToken()
  const res = await fetch(`/api/admin/dead-letters/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error ?? `Failed (${res.status})` }
  return { ok: true }
}

// ── Severity helpers ────────────────────────────────────

const SEV_BORDER: Record<string, string> = {
  P1: "border-l-red-500",
  P2: "border-l-orange-400",
  P3: "border-l-gray-300",
}

const SEV_BG: Record<string, string> = {
  P1: "bg-red-600 text-white",
  P2: "bg-orange-500 text-white",
  P3: "bg-gray-200 text-gray-600",
}

const STATUS_STYLE: Record<string, string> = {
  "auto-retry pending": "bg-blue-50 text-blue-700 border-blue-200",
  "auto-retried (failed)": "bg-orange-50 text-orange-700 border-orange-200",
  "safe to resolve": "bg-gray-50 text-gray-600 border-gray-200",
  "manual intervention required": "bg-red-50 text-red-700 border-red-200",
}

const ACTION_LABELS: Record<string, string> = {
  retry: "Retry recommended",
  resolve: "Safe to resolve",
  investigate: "Investigate",
  escalate: "Escalate immediately",
}

// ── Summary header ──────────────────────────────────────

function SummaryHeader({ entries }: { entries: DeadLetter[] }) {
  const total = entries.length
  const p1 = entries.filter((e) => e.decision?.severity === "P1").length
  const autoRetry = entries.filter((e) => e.status === "auto-retry pending").length
  const manual = entries.filter((e) => e.status === "manual intervention required").length

  const stats = [
    { label: "backlog", value: total, color: total > 0 ? "text-[var(--sn-text)]" : "text-[var(--sn-muted)]" },
    { label: "P1", value: p1, color: p1 > 0 ? "text-red-600" : "text-[var(--sn-muted)]" },
    { label: "auto-retry", value: autoRetry, color: autoRetry > 0 ? "text-blue-600" : "text-[var(--sn-muted)]" },
    { label: "needs action", value: manual, color: manual > 0 ? "text-red-600" : "text-[var(--sn-muted)]" },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border border-[var(--sn-border)] p-4">
          <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-xs text-[var(--sn-muted)] tracking-wide mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Copy button ─────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="text-[10px] text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition ml-1"
      title="Copy to clipboard"
    >
      {copied ? "copied" : "copy"}
    </button>
  )
}

// ── Timeline panel ──────────────────────────────────────

const TIMELINE_SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-400",
  warn: "bg-orange-400",
  error: "bg-red-500",
}

function TimelinePanel({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    safeFetch<TimelineData | null>(`/api/admin/dead-letters/timeline/${eventId}`, null)
      .then((d) => { setData(d); setLoading(false) })
  }, [eventId])

  return (
    <div className="bg-gray-50 border border-[var(--sn-border)] rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide">Timeline</p>
        <button onClick={onClose} className="text-xs text-[var(--sn-muted)] hover:text-[var(--sn-text)]">close</button>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--sn-muted)] animate-pulse">loading timeline...</p>
      ) : !data || data.timeline.length === 0 ? (
        <p className="text-xs text-[var(--sn-muted)]">No timeline events found.</p>
      ) : (
        <div className="relative pl-4 space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-gray-300" />

          {data.timeline.map((evt, i) => (
            <div key={i} className="relative flex items-start gap-3 py-1.5">
              {/* Dot */}
              <div className={`absolute left-[-12px] top-[7px] w-2.5 h-2.5 rounded-full border-2 border-gray-50 ${TIMELINE_SEVERITY_DOT[evt.severity] ?? "bg-gray-400"}`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-[var(--sn-muted)] tabular-nums shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-[10px] font-medium px-1 rounded ${
                    evt.source === "db" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {evt.source}
                  </span>
                  <span className="text-xs font-mono text-[var(--sn-text)] truncate">{evt.type}</span>
                </div>
                <p className="text-xs text-[var(--sn-muted)] mt-0.5">{evt.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DLQ Card ────────────────────────────────────────────

function DlqCard({
  entry,
  actionState,
  onAction,
}: {
  entry: DeadLetter
  actionState?: ActionState
  onAction: (id: string, action: "resolve" | "retry") => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)

  const sev = entry.decision?.severity ?? "P3"
  const status = entry.status ?? "unknown"
  const borderClass = SEV_BORDER[sev] ?? "border-l-gray-300"
  const ago = timeAgo(new Date(entry.createdAt))

  return (
    <div className={`bg-white border border-[var(--sn-border)] border-l-4 ${borderClass} space-y-3`}>
      {/* ── Row 1: Severity + Status + Time ── */}
      <div className="px-5 pt-4 flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${SEV_BG[sev] ?? "bg-gray-200 text-gray-600"}`}>
          {sev}
        </span>
        {entry.status && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${STATUS_STYLE[status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {status}
          </span>
        )}
        <span className="text-xs text-[var(--sn-muted)] ml-auto tabular-nums">{ago}</span>
        <span className="text-[10px] text-[var(--sn-muted)] tabular-nums">att: {entry.attempts}</span>
      </div>

      {/* ── Row 2: Event type + correlationId ── */}
      <div className="px-5 space-y-1">
        <p className="text-sm font-medium font-mono">{entry.eventType}</p>
        <div className="flex items-center gap-1">
          <p className="text-[11px] text-[var(--sn-muted)] font-mono truncate">{entry.eventId}</p>
          <CopyButton text={entry.eventId} />
        </div>
      </div>

      {/* ── Row 3: Error (collapsed by default) ── */}
      <div className="px-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <p className={`text-xs text-red-600 font-mono bg-red-50 px-2 py-1.5 rounded ${expanded ? "break-all" : "truncate"}`}>
            {entry.error}
          </p>
        </button>
      </div>

      {/* ── Row 4: Recommended action ── */}
      {entry.decision && (
        <div className="px-5">
          <p className="text-xs">
            <span className="font-medium">{ACTION_LABELS[entry.decision.action] ?? entry.decision.action}:</span>
            {" "}
            <span className="text-[var(--sn-muted)]">{entry.decision.reason}</span>
          </p>
        </div>
      )}

      {/* ── Row 5: Actions ── */}
      <div className="px-5 pb-4 flex items-center gap-3">
        <button
          onClick={() => onAction(entry.id, "resolve")}
          disabled={actionState?.status === "pending"}
          className="text-xs tracking-wide border border-[var(--sn-border)] px-3 py-1.5 hover:border-black transition disabled:opacity-50"
        >
          {actionState?.action === "resolve" && actionState.status === "pending" ? "resolving..." : "resolve"}
        </button>
        <button
          onClick={() => onAction(entry.id, "retry")}
          disabled={actionState?.status === "pending"}
          className="text-xs tracking-wide border border-[var(--sn-border)] px-3 py-1.5 hover:border-black transition disabled:opacity-50"
        >
          {actionState?.action === "retry" && actionState.status === "pending" ? "retrying..." : "retry"}
        </button>

        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="text-xs tracking-wide text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition ml-auto"
        >
          {showTimeline ? "hide timeline" : "timeline"}
        </button>

        {actionState?.status === "ok" && <span className="text-xs text-green-600">done</span>}
        {actionState?.status === "error" && <span className="text-xs text-red-600">{actionState.message}</span>}
      </div>

      {/* ── Inline timeline ── */}
      {showTimeline && (
        <div className="px-5 pb-4">
          <TimelinePanel eventId={entry.eventId} onClose={() => setShowTimeline(false)} />
        </div>
      )}
    </div>
  )
}

// ── Time helpers ────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Page ────────────────────────────────────────────────

export default function DeadLettersPage() {
  const [entries, setEntries] = useState<DeadLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<Record<string, ActionState>>({})

  const load = useCallback(async () => {
    const data = await safeFetch<{ entries: DeadLetter[] }>("/api/admin/dead-letters", { entries: [] })
    setEntries(data.entries)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAction(id: string, action: "resolve" | "retry") {
    setActions((prev) => ({ ...prev, [id]: { id, action, status: "pending" } }))
    const result = await postAction(id, action)
    if (result.ok) {
      setActions((prev) => ({ ...prev, [id]: { id, action, status: "ok" } }))
      setTimeout(() => load(), 600)
    } else {
      setActions((prev) => ({ ...prev, [id]: { id, action, status: "error", message: result.error } }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <p className="editorial-label mb-2">webhooks</p>
          <h1 className="editorial-h2">dead letter queue</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-sm text-gray-400 tracking-wide">loading...</div>
        </div>
      </div>
    )
  }

  // Sort: P1 first, then by createdAt desc
  const sorted = [...entries].sort((a, b) => {
    const sa = a.decision?.severity === "P1" ? 0 : 1
    const sb = b.decision?.severity === "P1" ? 0 : 1
    if (sa !== sb) return sa - sb
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-label mb-2">webhooks</p>
          <h1 className="editorial-h2">dead letter queue</h1>
        </div>
        <button
          onClick={() => { setLoading(true); load() }}
          className="text-sm tracking-wide text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition"
        >
          refresh
        </button>
      </div>

      {/* ── Summary stats ── */}
      <SummaryHeader entries={entries} />

      {/* ── Cards ── */}
      {sorted.length === 0 ? (
        <div className="bg-white border border-[var(--sn-border)] p-8 text-center">
          <p className="text-sm text-[var(--sn-muted)]">no unresolved dead letters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry) => (
            <DlqCard
              key={entry.id}
              entry={entry}
              actionState={actions[entry.id]}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
