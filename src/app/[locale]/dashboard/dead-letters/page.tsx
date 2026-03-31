"use client"

import { useEffect, useState } from "react"

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

type ActionState = { id: string; action: "resolve" | "retry"; status: "pending" | "ok" | "error"; message?: string }

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
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    return { ok: false, error: data.error ?? `Failed (${res.status})` }
  }

  return { ok: true }
}

export default function DeadLettersPage() {
  const [entries, setEntries] = useState<DeadLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<Record<string, ActionState>>({})

  async function load() {
    const data = await safeFetch<{ entries: DeadLetter[] }>("/api/admin/dead-letters", { entries: [] })
    setEntries(data.entries)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAction(id: string, action: "resolve" | "retry") {
    setActions((prev) => ({ ...prev, [id]: { id, action, status: "pending" } }))

    const result = await postAction(id, action)

    if (result.ok) {
      setActions((prev) => ({ ...prev, [id]: { id, action, status: "ok" } }))
      // Refresh list after short delay so the user sees the success state
      setTimeout(() => load(), 600)
    } else {
      setActions((prev) => ({
        ...prev,
        [id]: { id, action, status: "error", message: result.error },
      }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-12">
        <div>
          <p className="editorial-label mb-2">webhooks</p>
          <h1 className="editorial-h2">dead letter queue</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-sm text-gray-400 tracking-wide">cargando datos…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
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

      {entries.length === 0 ? (
        <div className="bg-white border border-[var(--sn-border)] p-8 text-center">
          <p className="text-sm text-[var(--sn-muted)]">no unresolved dead letters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const state = actions[entry.id]
            return (
              <div
                key={entry.id}
                className="bg-white border border-[var(--sn-border)] p-6 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono truncate">{entry.eventType}</p>
                      {entry.decision && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          entry.decision.severity === "P1" ? "bg-red-100 text-red-700" :
                          entry.decision.severity === "P2" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {entry.decision.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--sn-muted)] font-mono truncate">{entry.eventId}</p>
                    <p className="text-xs text-[var(--sn-muted)] font-mono truncate">{entry.id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {entry.status && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        entry.status === "auto-retry pending" ? "bg-blue-100 text-blue-700" :
                        entry.status === "auto-retried (failed)" ? "bg-orange-100 text-orange-700" :
                        entry.status === "safe to resolve" ? "bg-gray-100 text-gray-600" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {entry.status}
                      </span>
                    )}
                    <span className="text-xs text-[var(--sn-muted)]">
                      attempts: {entry.attempts}
                    </span>
                    <span className="text-xs text-[var(--sn-muted)]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded break-all">
                  {entry.error}
                </p>

                {entry.decision && (
                  <p className="text-xs text-[var(--sn-muted)] italic">
                    {entry.decision.reason}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleAction(entry.id, "resolve")}
                    disabled={state?.status === "pending"}
                    className="text-xs tracking-wide border border-[var(--sn-border)] px-3 py-1.5 hover:border-black transition disabled:opacity-50"
                  >
                    {state?.action === "resolve" && state.status === "pending" ? "resolving…" : "resolve"}
                  </button>
                  <button
                    onClick={() => handleAction(entry.id, "retry")}
                    disabled={state?.status === "pending"}
                    className="text-xs tracking-wide border border-[var(--sn-border)] px-3 py-1.5 hover:border-black transition disabled:opacity-50"
                  >
                    {state?.action === "retry" && state.status === "pending" ? "retrying…" : "retry"}
                  </button>

                  <a
                    href={`/api/admin/dead-letters/timeline/${entry.eventId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs tracking-wide text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition ml-auto"
                  >
                    timeline →
                  </a>

                  {state?.status === "ok" && (
                    <span className="text-xs text-green-600">done</span>
                  )}
                  {state?.status === "error" && (
                    <span className="text-xs text-red-600">{state.message}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
