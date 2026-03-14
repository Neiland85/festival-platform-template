type Forecast = {
  id: string
  title: string
  leads: number
  predictedAttendance: number
  capacity: number
  occupancy: number
}

export default function AttendanceForecastCard({ data }: { data: Forecast[] }) {

  return (
    <div className="bg-white border border-[var(--sn-border)] p-8">

      <p className="editorial-label mb-4">attendance forecast</p>

      <div className="space-y-4">

        {data.map(event => (

          <div key={event.id} className="border-b pb-4 last:border-0">

            <p className="font-medium">{event.title}</p>

            <div className="text-sm text-[var(--sn-muted)] mt-1">
              leads: {event.leads}
            </div>

            <div className="text-sm">
              predicted attendance: {event.predictedAttendance}
            </div>

            <div className="text-sm text-[var(--sn-muted)]">
              occupancy: {event.occupancy}% / {event.capacity}
            </div>

          </div>

        ))}

      </div>

    </div>
  )
}
