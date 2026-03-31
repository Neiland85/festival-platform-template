type ScoreEntry = {
  id: string
  leadId: string
  score: number
  tier: string
  factors: Record<string, number>
  scoredAt: string
}

type Props = {
  scores: ScoreEntry[]
}

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-800",
  warm: "bg-amber-100 text-amber-800",
  cold: "bg-blue-100 text-blue-800",
}

export default function SpudScoreTable({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">lead scores</p>
        <p className="text-sm text-[var(--sn-muted)]">
          no scores yet. run a scoring batch to generate scores.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">lead scores</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--sn-border)] text-left text-[var(--sn-muted)]">
              <th className="pb-2 font-normal">lead</th>
              <th className="pb-2 font-normal">score</th>
              <th className="pb-2 font-normal">tier</th>
              <th className="pb-2 font-normal">factors</th>
              <th className="pb-2 font-normal">scored</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.id} className="border-b border-[var(--sn-border)] last:border-0">
                <td className="py-2 font-mono text-xs truncate max-w-[180px]">
                  {s.leadId}
                </td>
                <td className="py-2 font-medium">{s.score}</td>
                <td className="py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      TIER_STYLES[s.tier] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {s.tier}
                  </span>
                </td>
                <td className="py-2 text-xs text-[var(--sn-muted)]">
                  {Object.entries(s.factors)
                    .map(([k, v]) => `${k.replace("_", " ")}=${Math.round(v)}`)
                    .join(", ")}
                </td>
                <td className="py-2 text-xs text-[var(--sn-muted)]">
                  {new Date(s.scoredAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
