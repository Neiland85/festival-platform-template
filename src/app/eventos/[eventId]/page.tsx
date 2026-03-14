import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getEvent } from "@/config/events"
import { Reveal } from "@/ui/components/Reveal"
import { ButtonPrimary } from "@/ui/components/UI"
import LazyTicketmasterWidget from "@/ui/components/LazyTicketmasterWidget"
import { ViewContentTracker } from "@/ui/components/ViewContentTracker"

type Props = {
  params: Promise<{
    eventId: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params
  const event = getEvent(eventId)
  if (!event) return {}

  const title = `${event.title} — Solaris Nerja`
  const description = event.description

  return {
    title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      locale: "es_ES",
      siteName: "Solaris Nerja",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${event.title} — Solaris Nerja Festival 2026`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: ["/og-image.jpg"],
    },
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params
  const event = getEvent(eventId)

  if (!event) {
    return notFound()
  }

  const hasRealUrl = event.ticketUrl && event.ticketUrl !== "#"

  return (
    <main className="min-h-screen">

      {/* ── Meta Pixel: ViewContent ── */}
      <ViewContentTracker eventId={event.id} eventTitle={event.title} />

      {/* ── Event Detail ── */}
      <section className="px-6 md:px-12 pt-16 md:pt-24 pb-16 max-w-4xl mx-auto">
        <Reveal>
          <Link
            href="/eventos"
            className="text-xs font-medium tracking-widest uppercase text-(--sn-muted)
              hover:text-(--sn-text) transition-colors"
          >
            ← Eventos
          </Link>

          <div className="mt-8 text-xs font-medium tracking-widest uppercase text-(--sn-muted)">
            {event.highlight}
          </div>

          <h1 className="mt-4 text-5xl md:text-7xl font-bold tracking-tight">
            {event.title}
          </h1>

          <p className="mt-6 text-lg text-[var(--sn-muted)] max-w-2xl leading-relaxed">
            {event.description}
          </p>

          {hasRealUrl && (
            <div className="mt-10">
              <ButtonPrimary href={event.ticketUrl}>Comprar Tickets</ButtonPrimary>
            </div>
          )}
        </Reveal>
      </section>

      <div className="border-t border-[var(--sn-border)]" />

      {/* ── Ticket Widget / Coming Soon ── */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <Reveal delayMs={150}>
          <LazyTicketmasterWidget
            eventId={event.id}
            ticketUrl={event.ticketUrl}
          />
        </Reveal>
      </section>

      <div className="border-t border-[var(--sn-border)]" />

      {/* ── Info ── */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <Reveal delayMs={200}>
          <div className="text-xs font-medium tracking-widest uppercase text-[var(--sn-muted)] mb-3">
            Información
          </div>
          <p className="text-[var(--sn-muted)] leading-relaxed">
            {hasRealUrl
              ? "Venta oficial gestionada por Ticketmaster. Las entradas y condiciones se rigen por la plataforma oficial."
              : "La venta de entradas estará disponible próximamente a través de Ticketmaster."
            }
          </p>
        </Reveal>
      </section>

    </main>
  )
}
