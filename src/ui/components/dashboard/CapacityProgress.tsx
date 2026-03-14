type EventCapacity = {
  id: string
  title: string
  capacity: number
  leads: number
}

export default function CapacityProgress({ events }: { events: EventCapacity[] }) {

  if (!events || events.length === 0) return null

  return (
    <div className="bg-white border border-[var(--sn-border)] p-8 space-y-6">

      <p className="editorial-label">
        interés vs aforo
      </p>

      {events.map(event => {

        const percent = Math.min(
          Math.round((event.leads / event.capacity) * 100),
          100
        )

        return (

          <div key={event.id} className="space-y-2">

            <div className="flex justify-between text-sm">
              <span>{event.title}</span>
              <span className="text-[var(--sn-muted)]">
                {event.leads} / {event.capacity}
              </span>
            </div>

            <div className="w-full h-3 bg-[var(--sn-surface)] rounded-sm overflow-hidden">
              <div
                className="bg-black h-full"
                style={{ width: percent + "%" }}
              />
            </div>

            <div className="text-xs text-[var(--sn-muted)]">
              {percent}% del aforo
            </div>

          </div>

        )
      })}

    </div>
  )
}
