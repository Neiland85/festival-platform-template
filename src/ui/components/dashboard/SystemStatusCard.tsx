type Props = {
  data: {
    status: string
    dbLatencyMs: number | null
    timestamp: string
  }
}

export default function SystemStatusCard({ data }: Props) {

  const healthy = data.status === "healthy"

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      
      <p className="editorial-label mb-2">
        system status
      </p>

      <div className="flex items-center gap-2 mb-2">

        <div
          className={`w-2 h-2 rounded-full ${
            healthy ? "bg-green-500" : "bg-red-500"
          }`}
        />

        <span className="font-medium">
          {healthy ? "operational" : "degraded"}
        </span>

      </div>

      <p className="text-sm text-[var(--sn-muted)]">
        db latency: {data.dbLatencyMs ?? "N/A"} ms
      </p>

    </div>
  )
}
