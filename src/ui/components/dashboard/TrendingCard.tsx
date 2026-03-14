type TrendingData = {
  title?: string
  leads?: number
}

export default function TrendingCard({ data }: { data: TrendingData | null }) {

  if (!data) return null

  return (
    <div className="bg-white border border-[var(--sn-border)] p-8">
      <p className="editorial-label mb-2">evento trending</p>

      <p className="text-lg font-medium">
        {data.title ?? "sin datos"}
      </p>

      <p className="text-sm text-[var(--sn-muted)]">
        {data.leads ?? 0} leads
      </p>
    </div>
  )
}
