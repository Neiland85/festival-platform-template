type OutcomeEntry = {
  id: string
  leadId: string
  orderId: string
  scoreAtConversion: number | null
  tierAtConversion: string | null
  convertedAt: string
}

type Props = {
  outcomes: OutcomeEntry[]
}

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-800",
  warm: "bg-amber-100 text-amber-800",
  cold: "bg-blue-100 text-blue-800",
}

export default function SpudOutcomesList({ outcomes }: Props) {
  if (outcomes.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">outcomes</p>
        <p className="text-sm text-[var(--sn-muted)]">no conversions tracked yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">outcomes</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--sn-border)] text-left text-[var(--sn-muted)]">
              <th className="pb-2 font-normal">lead</th>
              <th className="pb-2 font-normal">score</th>
              <th className="pb-2 font-normal">tier</th>
              <th className="pb-2 font-normal">order</th>
              <th className="pb-2 font-normal">converted</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => (
              <tr key={o.id} className="border-b border-[var(--sn-border)] last:border-0">
                <td className="py-2 font-mono text-xs truncate max-w-[180px]">
                  {o.leadId}
                </td>
                <td className="py-2">{o.scoreAtConversion ?? "-"}</td>
                <td className="py-2">
                  {o.tierAtConversion ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        TIER_STYLES[o.tierAtConversion] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {o.tierAtConversion}
                    </span>
                  ) : (
                    <span className="text-[var(--sn-muted)]">-</span>
                  )}
                </td>
                <td className="py-2 font-mono text-xs truncate max-w-[120px]">
                  {o.orderId.slice(0, 8)}
                </td>
                <td className="py-2 text-xs text-[var(--sn-muted)]">
                  {new Date(o.convertedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
