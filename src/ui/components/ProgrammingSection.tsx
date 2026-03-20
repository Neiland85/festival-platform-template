"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import ArtistModal from "./ArtistModal"
import SunriseButton from "./SunriseButton"

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

          /* ── Blur-to-reveal mist layer ── */
          .event-card-mist {
            position: absolute;
            inset: 0;
            z-index: 2;
            backdrop-filter: blur(18px) saturate(0.6);
            -webkit-backdrop-filter: blur(18px) saturate(0.6);
            background: radial-gradient(
              ellipse 80% 70% at 50% 40%,
              rgba(255, 51, 0, 0.06) 0%,
              rgba(10, 10, 10, 0.55) 50%,
              rgba(10, 10, 10, 0.75) 100%
            );
            transition: backdrop-filter 0.8s cubic-bezier(.16,1,.3,1),
                        -webkit-backdrop-filter 0.8s cubic-bezier(.16,1,.3,1),
                        opacity 0.8s cubic-bezier(.16,1,.3,1);
            opacity: 1;
            pointer-events: none;
          }
          .event-card:hover .event-card-mist,
          .event-card:focus-within .event-card-mist {
            backdrop-filter: blur(0px) saturate(1);
            -webkit-backdrop-filter: blur(0px) saturate(1);
            opacity: 0;
          }

          /* ── Mist particles (floating dots) ── */
          @keyframes mist-float-1 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
            33%      { transform: translate(12px, -18px) scale(1.3); opacity: 0.7; }
            66%      { transform: translate(-8px, -10px) scale(0.9); opacity: 0.3; }
          }
          @keyframes mist-float-2 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
            40%      { transform: translate(-15px, -12px) scale(1.2); opacity: 0.6; }
            70%      { transform: translate(10px, -20px) scale(0.8); opacity: 0.2; }
          }
          @keyframes mist-float-3 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            50%      { transform: translate(8px, -25px) scale(1.4); opacity: 0.8; }
          }
          .mist-particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            z-index: 3;
            transition: opacity 0.8s cubic-bezier(.16,1,.3,1);
          }
          .event-card:hover .mist-particle,
          .event-card:focus-within .mist-particle {
            opacity: 0 !important;
          }

          /* ── Ripple burst on card click ── */
          @keyframes card-ripple {
            0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.5; }
            60%  { opacity: 0.2; }
            100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
          }
          .card-ripple-ring {
            position: absolute;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,51,0,0.4) 0%, rgba(65,65,198,0.2) 50%, transparent 70%);
            pointer-events: none;
            z-index: 10;
            animation: card-ripple 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          /* ── Reduced motion ── */
          @media (prefers-reduced-motion: reduce) {
            .event-card-mist { transition: none; }
            .mist-particle { animation: none !important; }
            .card-ripple-ring { animation: none !important; }
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
                <EventCard
                  key={event.id}
                  event={event}
                  idx={idx}
                  isHovered={isHovered}
                  highlight={tHigh(event.id)}
                  moreInfoLabel={tEvents("moreInfo")}
                  onHover={setHovered}
                  onSelect={setSelectedId}
                />
              )
            })}
          </div>

          {/* ── Bottom: SunriseButton row ── */}
          <div
            className="flex flex-wrap justify-center gap-6 mt-16"
            style={{ animation: "prog-fade-up 0.8s ease-out 0.6s both" }}
          >
            {EVENTS.map((event, idx) => (
              <SunriseButton
                key={event.id}
                artistName={event.id.charAt(0).toUpperCase() + event.id.slice(1)}
                href={event.ticketUrl}
                colorIndex={idx}
                onSelect={() => setSelectedId(event.id)}
              />
            ))}
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


/* ══════════════════════════════════════════════════════════════════
   EventCard — Individual card with blur-to-reveal mist + ripple
   ══════════════════════════════════════════════════════════════════ */

type EventCardProps = {
  event: (typeof EVENTS)[number]
  idx: number
  isHovered: boolean
  highlight: string
  moreInfoLabel: string
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

/** Mist particle config — deterministic per card index */
const PARTICLES = [
  { top: "20%", left: "15%", size: 6,  anim: "mist-float-1", dur: "6s",   delay: "0s",    color: "rgba(255,51,0,0.3)" },
  { top: "35%", left: "70%", size: 8,  anim: "mist-float-2", dur: "7.5s", delay: "0.5s",  color: "rgba(65,65,198,0.25)" },
  { top: "55%", left: "40%", size: 5,  anim: "mist-float-3", dur: "5.5s", delay: "1s",    color: "rgba(255,150,80,0.3)" },
  { top: "15%", left: "55%", size: 4,  anim: "mist-float-1", dur: "8s",   delay: "1.5s",  color: "rgba(255,51,0,0.2)" },
  { top: "45%", left: "25%", size: 7,  anim: "mist-float-2", dur: "6.5s", delay: "0.8s",  color: "rgba(65,65,198,0.2)" },
  { top: "65%", left: "80%", size: 5,  anim: "mist-float-3", dur: "7s",   delay: "0.3s",  color: "rgba(255,200,100,0.25)" },
]

function EventCard({ event, idx, isHovered, highlight, moreInfoLabel, onHover, onSelect }: EventCardProps) {
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setRipple({ x, y, key: Date.now() })
      // Delay modal open so user sees the ripple
      setTimeout(() => onSelect(event.id), 350)
    },
    [event.id, onSelect],
  )

  return (
    <button
      type="button"
      className="event-card group relative rounded-2xl overflow-hidden text-left bg-transparent border-0 p-0 cursor-pointer"
      style={{
        aspectRatio: "3 / 4",
        animation: `prog-fade-up 0.6s ease-out ${0.1 + idx * 0.08}s both`,
      }}
      onClick={handleClick}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      aria-label={`${event.id} — ${highlight}`}
    >
      {/* ── Base image ── */}
      <Image
        src={event.image}
        alt={event.id}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        style={{
          transition: "transform 0.8s cubic-bezier(.16,1,.3,1), filter 0.6s ease",
          transform: isHovered ? "scale(1.08)" : "scale(1)",
          filter: isHovered ? "brightness(1.15) saturate(1.2)" : "brightness(0.75) saturate(0.9)",
        }}
      />

      {/* ── Mist layer (blur-to-reveal) ── */}
      <div className="event-card-mist" />

      {/* ── Floating mist particles ── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="mist-particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `${p.anim} ${p.dur} ease-in-out ${p.delay} infinite`,
            filter: "blur(2px)",
          }}
        />
      ))}

      {/* ── Gradient overlay (always visible, fades slightly on hover) ── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 4,
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 35%, transparent 65%)",
          transition: "opacity 0.6s ease",
          opacity: isHovered ? 0.7 : 1,
        }}
      />

      {/* ── Hover border glow ── */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          zIndex: 5,
          transition: "box-shadow 0.4s ease",
          boxShadow: isHovered
            ? "inset 0 0 0 2px rgba(255,51,0,0.5), 0 0 60px rgba(255,51,0,0.15), 0 0 120px rgba(65,65,198,0.08)"
            : "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      />

      {/* ── Ripple burst on click ── */}
      {ripple && (
        <div
          key={ripple.key}
          className="card-ripple-ring"
          style={{ left: ripple.x, top: ripple.y, zIndex: 10 }}
          onAnimationEnd={() => setRipple(null)}
        />
      )}

      {/* ── Text overlay ── */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6" style={{ zIndex: 6 }}>
        {/* Time */}
        <p
          className="text-xs tracking-widest uppercase mb-2"
          style={{
            color: "var(--sn-solar, #FF3300)",
            opacity: isHovered ? 1 : 0.7,
            transition: "opacity 0.3s ease",
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
          }}
        >
          {event.time}
        </p>

        {/* Name */}
        <h3
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{
            color: "#ffffff",
            transition: "transform 0.5s cubic-bezier(.16,1,.3,1)",
            transform: isHovered ? "translateY(-6px)" : "translateY(0)",
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
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
          }}
        >
          {highlight}
        </span>

        {/* More info hint on hover */}
        <p
          className="mt-3 text-xs tracking-widest uppercase"
          style={{
            color: "rgba(255,255,255,0.5)",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
          }}
        >
          {moreInfoLabel} →
        </p>
      </div>
    </button>
  )
}
