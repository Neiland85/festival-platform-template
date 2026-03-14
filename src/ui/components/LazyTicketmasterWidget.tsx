"use client"

import dynamic from "next/dynamic"

const TicketmasterWidget = dynamic(
  () => import("@/ui/components/TicketmasterWidget").then((m) => m.TicketmasterWidget),
  { ssr: false }
)

type Props = {
  eventId: string
  ticketUrl: string
}

export default function LazyTicketmasterWidget({ eventId, ticketUrl }: Props) {
  return <TicketmasterWidget eventId={eventId} ticketUrl={ticketUrl} />
}
