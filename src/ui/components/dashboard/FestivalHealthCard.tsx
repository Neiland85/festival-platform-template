type HealthData = {
  totalLeads: number
  last24h: number
  capacity: number
  occupancy: number
  momentum: string
}

export default function FestivalHealthCard({ data }: { data: HealthData }) {

  const percentage = Math.round(data.occupancy * 100)

  let color = "text-gray-500"

  if (data.momentum === "STRONG") color = "text-green-600"
  if (data.momentum === "GROWING") color = "text-yellow-600"

  return (

    <div className="bg-white border border-[var(--sn-border)] p-8">

      <p className="editorial-label mb-2">
        festival momentum
      </p>

      <p className={`text-3xl font-semibold ${color}`}>
        {data.momentum}
      </p>

      <div className="mt-4 text-sm text-[var(--sn-muted)] space-y-1">

        <p>
          Leads totales: {data.totalLeads}
        </p>

        <p>
          Últimas 24h: {data.last24h}
        </p>

        <p>
          Ocupación estimada: {percentage}%
        </p>

      </div>

    </div>

  )

}
