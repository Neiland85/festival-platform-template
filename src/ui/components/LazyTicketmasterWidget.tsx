"use client"

import dynamic from "next/dynamic"

const TicketmasterWidget = dynamic(
  () => import("@/ui/components/TicketmasterWidget").then((m) => m.TicketmasterWidget),
  { ssr: false }
)

type Props = {
  eventId: string
  ticketUrl: string
  priceCents?: number | null
  locale?: string
  eventTitle?: string
}

export default function LazyTicketmasterWidget({ eventId, ticketUrl, priceCents, locale, eventTitle }: Props) {
  return (
    <TicketmasterWidget
      eventId={eventId}
      ticketUrl={ticketUrl}
      priceCents={priceCents}
      locale={locale}
      eventTitle={eventTitle}
    />
  )
}
