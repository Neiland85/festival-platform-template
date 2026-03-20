"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import ArtistModal from "./ArtistModal"

/* ── Event catalog (static — could come from Sanity in the future) ── */
const EVENTS = [
  { id: "chambao",       image: "/events/chambao.jpg",       time: "Vie 20 Jun · 22:00", ticketUrl: "#" },
  { id: "bresh",         image: "/events/bresh.jpg",         time: "Sáb 21 Jun · 23:30", ticketUrl: "#" },
  { id: "ohsee",         image: "/events/ohsee.jpg",         time: "Dom 22 Jun · 20:00", ticketUrl: "#" },
  { id: "goa",           image: "/events/goa.jpg",           time: "Jue 26 Jun · 23:00", ticketUrl: "#" },
  { id: "tropicalia",    image: "/events/tropicalia.png",    time: "Vie 27 Jun · 21:00", ticketUrl: "#" },
  { id: "tecnoflamenco", image: "/events/tecnoflamenco.png", time: "Sáb 28 Jun · 22:30", ticketUrl: "#" },
] as const

export default function ProgrammingSection() {
  const tEvents = useTranslations("events")
  const tDesc   = useTranslations("eventDescriptions")
  const tHigh   = useTranslations("eventHighlights")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const selected = EVENTS.find((e) => e.id === selectedId) ?? null

  const handleClose = useCallback(() => setSelectedId(null), [])

  const artistPayload = selected
    ? {
        id: selected.id,
        title: selected.id.charAt(0).toUpperCase() + selected.id.slice(1),
        description: tDesc(selected.id),
        highlight: tHigh(selected.id),
        ticketUrl: selected.ticketUrl,
        time: selected.time,
      }
    : null

  return (
    <>
      <section
        id="programacion"
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)",
        }}
      >
        {/* ── Keyframes ── */}
        <style>{`
          @keyframes prog-fade-up {
            from { opacity: 0; transform: translateY(32px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes prog-glow {
            0%, 100% { opacity: 0.4; }
            50%      { opacity: 0.7; }
          }
        `}</style>

        {/* ── Ambient glow ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -160,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,51,0,0.08) 0%, rgba(65,65,198,0.04) 50%, transparent 70%)",
            filter: "blur(80px)",
            animation: "prog-glow 8s ease-in-out infinite",
          }}
        />

        {/* ── Content ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">

          {/* ── Header ── */}
          <div
            className="text-center mb-16"
            style={{ animation: "prog-fade-up 0.8s ease-out both" }}
          >
            <p
              className="uppercase text-sm mb-4 font-medium tracking-widest"
              style={{ color: "var(--sn-solar, #FF3300)" }}
            >
              Line-up 2026
            </p>
            <h2
              className="text-5xl md:text-7xl font-bold tracking-tight"
              style={{ color: "#ffffff", letterSpacing: "-0.02em" }}
            >
              {tEvents("heading")}
            </h2>
            <div
              className="mt-6 mx-auto w-32 h-1 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, var(--sn-solar, #FF3300), var(--sn-deep-blue, #4141C6), transparent)",
              }}
            />
          </div>

          {/* ── Event grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EVENTS.map((event, idx) => {
              const isHovered = hovered === event.id
              return (
                <button
                  key={event.id}
                  type="button"
                  className="group relative rounded-2xl overflow-hidden text-left bg-transparent border-0 p-0 cursor-pointer"
                  style={{
                    aspectRatio: "3 / 4",
                    animation: `prog-fade-up 0.6s ease-out ${0.1 + idx * 0.08}s both`,
                  }}
                  onClick={() => setSelectedId(event.id)}
                  onMouseEnter={() => setHovered(event.id)}
                  onMouseLeave={() => setHovered(null)}
                  aria-label={`${event.id} — ${tHigh(event.id)}`}
                >
                  {/* Image */}
                  <Image
                    src={event.image}
                    alt={event.id}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    style={{
                      transition: "transform 0.6s cubic-bezier(.16,1,.3,1), filter 0.6s ease",
                      transform: isHovered ? "scale(1.06)" : "scale(1)",
                      filter: isHovered ? "brightness(1.1)" : "brightness(0.85)",
                    }}
                  />

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
                    }}
                  />

                  {/* Hover border glow */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      transition: "box-shadow 0.4s ease",
                      boxShadow: isHovered
                        ? "inset 0 0 0 2px rgba(255,51,0,0.5), 0 0 40px rgba(255,51,0,0.1)"
                        : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                    }}
                  />

                  {/* Text overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                    {/* Time */}
                    <p
                      className="text-xs tracking-widest uppercase mb-2"
                      style={{
                        color: "var(--sn-solar, #FF3300)",
                        opacity: isHovered ? 1 : 0.7,
                        transition: "opacity 0.3s ease",
                      }}
                    >
                      {event.time}
                    </p>

                    {/* Name */}
                    <h3
                      className="text-2xl sm:text-3xl font-bold tracking-tight"
                      style={{
                        color: "#ffffff",
                        transition: "transform 0.4s cubic-bezier(.16,1,.3,1)",
                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                      }}
                    >
                      {event.id.charAt(0).toUpperCase() + event.id.slice(1)}
                    </h3>

                    {/* Highlight tag */}
                    <span
                      className="inline-block mt-2 px-3 py-1 text-xs tracking-widest uppercase rounded-full"
                      style={{
                        backgroundColor: "rgba(255,51,0,0.15)",
                        color: "var(--sn-solar, #FF3300)",
                        border: "1px solid rgba(255,51,0,0.25)",
                      }}
                    >
                      {tHigh(event.id)}
                    </span>

                    {/* More info hint on hover */}
                    <p
                      className="mt-3 text-xs tracking-widest uppercase"
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? "translateY(0)" : "translateY(8px)",
                        transition: "opacity 0.3s ease, transform 0.3s ease",
                      }}
                    >
                      {tEvents("moreInfo")} →
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Bottom CTA ── */}
          <div
            className="text-center mt-16"
            style={{ animation: "prog-fade-up 0.8s ease-out 0.6s both" }}
          >
            <a
              href="#pricing"
              className="inline-block px-10 py-4 text-sm font-bold tracking-widest uppercase rounded-full transition-all duration-300"
              style={{
                backgroundColor: "var(--sn-solar, #FF3300)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sn-deep-blue, #4141C6)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sn-solar, #FF3300)"
              }}
            >
              {tEvents("buyTickets")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Detail modal (reuses ArtistModal) ── */}
      <ArtistModal
        open={selectedId !== null}
        onClose={handleClose}
        artist={artistPayload}
        artistImage={selected?.image}
        artistImagePosition="center 30%"
      />
    </>
  )
}
