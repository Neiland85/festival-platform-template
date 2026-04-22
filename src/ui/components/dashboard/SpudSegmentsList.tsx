type SegmentEntry = {
  id: string
  name: string
  description: string | null
  filters: Record<string, unknown>
  leadCount: number
  createdBy: string
  createdAt: string
}

type Props = {
  segments: SegmentEntry[]
}

export default function SpudSegmentsList({ segments }: Props) {
  if (segments.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">segments</p>
        <p className="text-sm text-[var(--sn-muted)]">no segments yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">segments</p>

      <div className="space-y-3">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="flex items-center justify-between border-b border-[var(--sn-border)] last:border-0 pb-3 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium">{seg.name}</p>
              {seg.description && (
                <p className="text-xs text-[var(--sn-muted)]">{seg.description}</p>
              )}
              <p className="text-xs text-[var(--sn-muted)] mt-1">
                {Object.entries(seg.filters)
                  .map(([k, v]) => `${k}=${String(v)}`)
                  .join(", ") || "all leads"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{seg.leadCount} leads</p>
              <p className="text-xs text-[var(--sn-muted)]">
                {new Date(seg.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
