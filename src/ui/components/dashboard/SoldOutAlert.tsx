type EventData = {
  title: string
  leads: number
  capacity: number
}

export default function SoldOutAlert({ event }: { event: EventData | null }) {

  if (!event) return null

  const percent = (event.leads / event.capacity) * 100

  if (percent < 90) return null

  return (
    <div className="bg-red-50 border border-red-200 p-6 space-y-2">

      <p className="text-xs tracking-wide text-red-700 uppercase">
        alerta aforo
      </p>

      <p className="text-lg font-semibold text-red-700">
        ⚠ posible sold-out
      </p>

      <p className="text-sm text-red-600">
        {event.title} está al {percent.toFixed(1)}% del aforo
      </p>

    </div>
  )
}
