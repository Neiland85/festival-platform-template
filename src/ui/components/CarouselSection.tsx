"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"

const ALL_IMAGES = [
  { src: "/carousel/gallery-03.webp", alt: "Palmeras y público en la playa" },
  { src: "/carousel/carousel-01.webp", alt: "Relax frente al mar" },
  { src: "/carousel/hero-01.webp", alt: "Concierto en vivo" },
  { src: "/carousel/gallery-01.webp", alt: "Festival al atardecer" },
  { src: "/carousel/carousel-08.webp", alt: "Mercadillo vintage" },
  { src: "/carousel/gallery-06.webp", alt: "Gastronomía del festival" },
  { src: "/carousel/hero-02.webp", alt: "Público disfrutando" },
  { src: "/carousel/carousel-02.webp", alt: "Costa del Sol" },
  { src: "/carousel/gallery-04.webp", alt: "Ambiente de playa" },
  { src: "/carousel/OS25_Rakelodel_210 2.webp", alt: "Oh See Málaga en directo" },
  { src: "/carousel/carousel-03.webp", alt: "Atardecer mediterráneo" },
  { src: "/carousel/gallery-07.webp", alt: "Experiencia gastronómica" },
  { src: "/carousel/hero-04.webp", alt: "Artesanía local" },
  { src: "/carousel/carousel-09.webp", alt: "Moda y estilo" },
  { src: "/carousel/gallery-05.webp", alt: "Ambiente nocturno" },
  { src: "/carousel/sidonie publico.webp", alt: "Sidonie con el público" },
  { src: "/carousel/carousel-04.webp", alt: "Chiringuito" },
  { src: "/carousel/gallery-08.webp", alt: "Festival de noche" },
  { src: "/carousel/carousel-05.webp", alt: "Sol y brisa marina" },
  { src: "/carousel/gallery-09.webp", alt: "Decoración del festival" },
  { src: "/carousel/carousel-06.webp", alt: "Gente bailando" },
  { src: "/carousel/gallery-10.webp", alt: "Detalle artístico" },
  { src: "/carousel/carousel-07.webp", alt: "Panorámica playa" },
  { src: "/carousel/hero-03.webp", alt: "Artesanía y joyas" },
  { src: "/carousel/carousel-10.webp", alt: "Cultura mediterránea" },
  { src: "/carousel/gallery-02.webp", alt: "Momentos del festival" },
]

const ROW_TOP = ALL_IMAGES.slice(0, 13)
const ROW_BOTTOM = ALL_IMAGES.slice(13)

export default function CarouselSection() {
  const [hovered, setHovered] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const closeLightbox = useCallback(() => setLightbox(null), [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox, closeLightbox])

  return (
    <section id="ambiente" className="relative overflow-hidden">

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        @keyframes sway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(0.5deg); }
          75% { transform: translateY(3px) rotate(-0.3deg); }
        }
        @keyframes grain-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-1.5%, -0.8%); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .marquee-strip {
          display: flex;
          width: max-content;
        }
        .marquee-strip--left { animation: scroll-left 65s linear infinite; }
        .marquee-strip--right { animation: scroll-right 58s linear infinite; }
        .marquee-strip:hover { animation-play-state: paused; }
      `}</style>

      {/* ── Warm gradient bg ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #fef9f0 0%, #fdf2e0 30%, #fef6ea 55%, #fff8f0 80%, #ffffff 100%)",
        }}
      />

      {/* ── Sand texture ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.25,
          backgroundImage:
            "radial-gradient(circle at 18% 78%, rgba(210,180,140,0.35) 0%, transparent 50%), radial-gradient(circle at 82% 22%, rgba(255,220,180,0.25) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(245,222,179,0.18) 0%, transparent 60%)",
          animation: "grain-drift 22s ease-in-out infinite",
        }}
      />

      {/* ── Sun glow ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80,
          right: "20%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,200,100,0.18) 0%, rgba(255,180,80,0.06) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* ── Sand dots ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.18 }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={`dot-${i}`}
            className="absolute rounded-full"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              backgroundColor: `hsl(${34 + (i % 18)}, ${48 + (i % 25)}%, ${68 + (i % 16)}%)`,
              top: `${6 + ((i * 3.9) % 88)}%`,
              left: `${3 + ((i * 7.1) % 94)}%`,
            }}
          />
        ))}
      </div>

      {/* ── Wave decoration bottom ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden"
        style={{ height: 50 }}
      >
        <svg
          viewBox="0 0 1440 50"
          fill="none"
          className="w-full"
          style={{ animation: "sway 9s ease-in-out infinite" }}
        >
          <path
            d="M0 25 C360 0 720 50 1080 25 C1260 12 1350 38 1440 25 V50 H0Z"
            fill="rgba(255,255,255,0.55)"
          />
          <path
            d="M0 35 C360 12 720 48 1080 30 C1260 22 1350 44 1440 35 V50 H0Z"
            fill="rgba(255,255,255,0.3)"
          />
        </svg>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="relative z-10 py-24">

        {/* ── Header ── */}
        <div
          className="text-center mb-16 px-6"
          style={{ animation: "fade-up 0.8s ease-out both" }}
        >
          <p
            className="uppercase text-sm mb-4 font-medium"
            style={{ letterSpacing: "0.25em", color: "#c08840" }}
          >
            Sol, playa y cultura
          </p>
          <h2 className="text-5xl md:text-7xl font-bold text-neutral-900" style={{ letterSpacing: "-0.02em" }}>
            El ambiente Solaris
          </h2>
          <div
            className="mt-6 mx-auto w-32 h-1 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #e8b86d, #d4956b, #e8b86d, transparent)",
            }}
          />
          <p className="mt-6 text-neutral-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Gastronomía, mercadillos, atardeceres y música en directo. Una experiencia que va mucho
            más allá de los conciertos.
          </p>
        </div>

        {/* ── ROW 1 → left ── */}
        <div className="relative mb-4 overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 w-20 z-10"
            style={{ background: "linear-gradient(90deg, #fef9f0, transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-20 z-10"
            style={{ background: "linear-gradient(270deg, #fef9f0, transparent)" }}
          />

          <div className="marquee-strip marquee-strip--left">
            {[...ROW_TOP, ...ROW_TOP].map((img, i) => (
              <button
                key={`a-${i}`}
                type="button"
                className="flex-shrink-0 mx-2 rounded-2xl overflow-hidden relative cursor-pointer border-0 bg-transparent p-0"
                style={{
                  width: i % 3 === 0 ? 380 : i % 3 === 1 ? 320 : 280,
                  height: 240,
                }}
                onClick={() => setLightbox(img.src)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  style={{
                    transition: "transform 0.5s, filter 0.5s",
                    transform: hovered === i ? "scale(1.08)" : "scale(1)",
                    filter:
                      hovered === i
                        ? "brightness(1.1) saturate(1.2)"
                        : "brightness(1) saturate(1)",
                  }}
                  sizes="400px"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    transition: "opacity 0.3s",
                    opacity: hovered === i ? 1 : 0,
                    background:
                      "linear-gradient(to top, rgba(180,120,60,0.3), transparent 60%)",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    transition: "box-shadow 0.3s",
                    boxShadow:
                      hovered === i
                        ? "inset 0 0 0 2px rgba(232,184,109,0.5), 0 8px 30px rgba(180,120,60,0.2)"
                        : "inset 0 0 0 1px rgba(0,0,0,0.05)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── ROW 2 → right ── */}
        <div className="relative mb-4 overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 w-20 z-10"
            style={{ background: "linear-gradient(90deg, #fef9f0, transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-20 z-10"
            style={{ background: "linear-gradient(270deg, #fef9f0, transparent)" }}
          />

          <div className="marquee-strip marquee-strip--right">
            {[...ROW_BOTTOM, ...ROW_BOTTOM].map((img, i) => (
              <button
                key={`b-${i}`}
                type="button"
                className="flex-shrink-0 mx-2 rounded-2xl overflow-hidden relative cursor-pointer border-0 bg-transparent p-0"
                style={{
                  width: i % 3 === 0 ? 280 : i % 3 === 1 ? 380 : 320,
                  height: 220,
                }}
                onClick={() => setLightbox(img.src)}
                onMouseEnter={() => setHovered(1000 + i)}
                onMouseLeave={() => setHovered(null)}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  style={{
                    transition: "transform 0.5s, filter 0.5s",
                    transform: hovered === 1000 + i ? "scale(1.08)" : "scale(1)",
                    filter:
                      hovered === 1000 + i
                        ? "brightness(1.1) saturate(1.2)"
                        : "brightness(1) saturate(1)",
                  }}
                  sizes="400px"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    transition: "opacity 0.3s",
                    opacity: hovered === 1000 + i ? 1 : 0,
                    background:
                      "linear-gradient(to top, rgba(180,120,60,0.3), transparent 60%)",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    transition: "box-shadow 0.3s",
                    boxShadow:
                      hovered === 1000 + i
                        ? "inset 0 0 0 2px rgba(232,184,109,0.5), 0 8px 30px rgba(180,120,60,0.2)"
                        : "inset 0 0 0 1px rgba(0,0,0,0.05)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="max-w-4xl mx-auto mt-16 px-6">
          <div
            className="flex justify-around py-8 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,248,240,0.5))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(232,184,109,0.2)",
              boxShadow: "0 4px 30px rgba(210,170,120,0.08)",
            }}
          >
            {[
              { num: "10", label: "Días de festival" },
              { num: "8", label: "Artistas en directo" },
              { num: "5K+", label: "Asistentes" },
              { num: "1", label: "Playa increíble" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold" style={{ color: "#b87333" }}>
                  {s.num}
                </p>
                <p className="text-xs md:text-sm text-neutral-500 mt-1 uppercase" style={{ letterSpacing: "0.1em" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white text-4xl cursor-pointer bg-transparent border-0 z-50"
            style={{ lineHeight: 1 }}
            aria-label="Cerrar"
          >
            &times;
          </button>
          <div className="relative w-[90vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox}
              alt="Festival Solaris Nerja"
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </section>
  )
}
