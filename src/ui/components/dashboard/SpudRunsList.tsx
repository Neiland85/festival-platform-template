type RunEntry = {
  id: string
  type: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  output: Record<string, unknown> | null
  error: string | null
}

type Props = {
  runs: RunEntry[]
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-yellow-100 text-yellow-800",
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "-"
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function SpudRunsList({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">runs</p>
        <p className="text-sm text-[var(--sn-muted)]">no runs yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">runs</p>

      <div className="space-y-3">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between border-b border-[var(--sn-border)] last:border-0 pb-3 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  STATUS_STYLES[run.status] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {run.status}
              </span>
              <span className="text-sm font-medium">{run.type}</span>
              {run.output && (
                <span className="text-xs text-[var(--sn-muted)]">
                  {(run.output as Record<string, number>)["tasksCompleted"] ?? 0} tasks
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-[var(--sn-muted)]">
              <span>{formatDuration(run.startedAt, run.completedAt)}</span>
              <span>{new Date(run.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
