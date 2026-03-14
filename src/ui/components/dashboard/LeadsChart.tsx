type LeadsChartData = {
  leadsTotal: number
  lastHour: number
  last24h: number
}

export default function LeadsChart({ data }: { data: LeadsChartData }) {
  if (!data) return null

  return (
    <div className="bg-white border border-[var(--sn-border)] p-8">
      <p className="editorial-label mb-2">leads</p>

      <div className="space-y-2 text-sm">
        <p>Total: {data.leadsTotal}</p>
        <p>Última hora: {data.lastHour}</p>
        <p>Últimas 24h: {data.last24h}</p>
      </div>
    </div>
  )
}
