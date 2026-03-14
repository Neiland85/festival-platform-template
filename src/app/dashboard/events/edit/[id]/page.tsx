import { findEventById } from "@/adapters/db/event-repository"
import { notFound } from "next/navigation"
import EventEditForm from "./EventEditForm"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Props) {
  const { id } = await params
  const event = await findEventById(id)

  if (!event) {
    notFound()
  }

  return (
    <div className="max-w-xl">
      <div className="mb-10">
        <p className="editorial-label mb-2">editar</p>
        <h1 className="editorial-h2">{event.title}</h1>
      </div>
      <EventEditForm event={event} />
    </div>
  )
}
