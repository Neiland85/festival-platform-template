export const dynamic = "force-dynamic"
export const revalidate = 0

import { EVENTS } from "@/config/events"
import { Reveal } from "@/ui/components/Reveal"
import EventCard from "@/ui/components/EventCard"

export default function EventosPage(){

  return (
    <section className="max-w-6xl mx-auto py-24 px-6 space-y-16">

      <h1 className="editorial-h2 text-center">
        Programación
      </h1>

      <div className="grid md:grid-cols-3 gap-10">

        {EVENTS.map(event => (
          <Reveal key={event.id}>
            <EventCard event={event}/>
          </Reveal>
        ))}

      </div>

    </section>
  )

}
