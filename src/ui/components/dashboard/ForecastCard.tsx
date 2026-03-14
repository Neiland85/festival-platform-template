type ForecastData = {
  title?: string
  eta?: string
}

export default function ForecastCard({ data }: { data: ForecastData | null }) {

  if (!data) return null

  return (
    <div className="bg-white border border-[var(--sn-border)] p-8">
      <p className="editorial-label mb-2">predicción sold out</p>

      <p className="text-lg font-medium">
        {data.title ?? "evento"}
      </p>

      <p className="text-sm text-[var(--sn-muted)]">
        {data.eta ?? "sin predicción"}
      </p>
    </div>
  )
}
