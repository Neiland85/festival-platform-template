interface EventCardProps {
  event: {
    id: string
    title: string
    time: string
    description: string
  }
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <div className="space-y-4">

      <p className="editorial-label">
        {event.time}
      </p>

      <h3 className="text-xl font-medium">
        {event.title}
      </h3>

      <p className="text-sm opacity-70 leading-relaxed">
        {event.description}
      </p>

    </div>
  )
}
