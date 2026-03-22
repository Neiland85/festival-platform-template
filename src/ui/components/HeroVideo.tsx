"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, useCallback } from "react"
import { SITE_NAME } from "@/config/site"

// ── CDN / Local asset resolution ────────────────────
//
// If NEXT_PUBLIC_CDN_HERO_URL is set (e.g., https://d1abc.cloudfront.net/hero/),
// videos are served from CDN. Otherwise falls back to /public/hero/ for local dev.
//
// The CDN path should end with `/` and contain the same filenames.
// For responsive delivery, the CDN variant uses WebM with MP4 fallback.

const CDN_BASE = process.env["NEXT_PUBLIC_CDN_HERO_URL"] ?? ""

function heroSrc(filename: string): string {
  if (CDN_BASE) {
    const base = CDN_BASE.endsWith("/") ? CDN_BASE : `${CDN_BASE}/`
    return `${base}${filename}`
  }
  return `/hero/${filename}`
}

// ── Video manifest ──────────────────────────────────
//
// Each entry supports optional WebM (preferred) + MP4 fallback.
// The component picks the first playable source.

interface HeroVideoEntry {
  webm?: string
  mp4: string
}

const VIDEO_MANIFEST: HeroVideoEntry[] = [
  {
    webm: heroSrc("aftermovie-corto.webm"),
    mp4: heroSrc("Tomorrowland-Belgium_2016_Official-Aftermovie_corto.mov"),
  },
  {
    webm: heroSrc("architecture-1080p.webm"),
    mp4: heroSrc("The Architecture of Experience_1080p_caption.mp4"),
  },
]

/** Ticketmaster URL — replace with real event link */
const TICKETMASTER_URL = "https://www.ticketmaster.es"

const CROSSFADE_MS = 1200

// ── Component ────────────────────────────────────────

export default function HeroVideo() {
  const t = useTranslations("hero")
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showA, setShowA] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  // Subtle parallax on mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    })
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  // Initial fade-in
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Crossfade between videos when one ends
  const handleVideoEnd = useCallback(() => {
    const nextIndex = (activeIndex + 1) % VIDEO_MANIFEST.length
    const nextRef = showA ? videoBRef : videoARef
    const entry = VIDEO_MANIFEST[nextIndex]!

    // Preload next video — prefer WebM, fallback to MP4
    if (nextRef.current) {
      nextRef.current.src = entry.webm ?? entry.mp4
      nextRef.current.load()
      nextRef.current.play().catch(() => {})
    }

    // Crossfade
    setShowA(!showA)
    setActiveIndex(nextIndex)
  }, [activeIndex, showA])

  // Parallax offset (very subtle: ±8px)
  const parallaxX = (mousePos.x - 0.5) * 16
  const parallaxY = (mousePos.y - 0.5) * 16

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      {/* ── Video Layer A ── */}
      <video
        ref={videoARef}
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
        style={{
          opacity: showA ? 0.35 : 0,
          transform: `scale(1.08) translate(${parallaxX}px, ${parallaxY}px)`,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out, transform 0.3s ease-out`,
          willChange: "opacity, transform",
        }}
      >
        {VIDEO_MANIFEST[0]!.webm && (
          <source src={VIDEO_MANIFEST[0]!.webm} type="video/webm" />
        )}
        <source src={VIDEO_MANIFEST[0]!.mp4} type="video/mp4" />
      </video>

      {/* ── Video Layer B ── */}
      <video
        ref={videoBRef}
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: showA ? 0 : 0.35,
          transform: `scale(1.08) translate(${parallaxX}px, ${parallaxY}px)`,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out, transform 0.3s ease-out`,
          willChange: "opacity, transform",
        }}
      >
        {VIDEO_MANIFEST[1]!.webm && (
          <source src={VIDEO_MANIFEST[1]!.webm} type="video/webm" />
        )}
        <source src={VIDEO_MANIFEST[1]!.mp4} type="video/mp4" />
      </video>

      {/* ── Grain / noise overlay (subtle texture) ── */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Gradient overlay: dark edges → semi-transparent center ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgba(0,0,0,0.55) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)
          `,
        }}
      />

      {/* ── Horizontal scan line (very subtle, cinematic) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.03,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
        }}
      />

      {/* ── Content ── */}
      <div
        className="relative z-10 flex items-center justify-center h-full px-6"
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 1s ease-out 0.5s, transform 1s ease-out 0.5s",
        }}
      >
        <div className="text-center max-w-4xl">
          {/* Title */}
          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight text-white mb-4"
            style={{
              textShadow: "0 0 60px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.3)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("title", { siteName: SITE_NAME })}
          </h1>

          {/* Subtitle with thin line accents */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="h-px w-12 bg-white/30" />
            <p
              className="text-lg sm:text-xl md:text-2xl text-white/80 font-light tracking-widest uppercase"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}
            >
              {t("subtitle")}
            </p>
            <span className="h-px w-12 bg-white/30" />
          </div>

          {/* ── CTA Button → Ticketmaster ── */}
          <a
            href={TICKETMASTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 px-10 py-4 overflow-hidden rounded-full transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #026CDF 0%, #0256B3 100%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(2,108,223,0.4), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {/* Hover glow */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(135deg, #0280FF 0%, #026CDF 100%)",
              }}
            />

            {/* Shimmer sweep on hover */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
              }}
            />

            <span className="relative z-10 text-white text-lg font-bold tracking-wider uppercase">
              {t("cta")}
            </span>

            {/* Ticketmaster icon/badge */}
            <span className="relative z-10 flex items-center gap-1.5 text-white/70 text-xs font-medium border-l border-white/20 pl-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                <path d="M15 5l-1 1" />
                <path d="M2 12h6" />
                <path d="M22 12h-2" />
                <path d="M12 2v2" />
                <path d="M12 22v-2" />
                <path d="M20 16l-1-1" />
                <path d="M20 8l-1 1" />
                <path d="M4 16l1-1" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              <span className="hidden sm:inline">via Ticketmaster</span>
            </span>

            {/* External link arrow */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-white/50 group-hover:text-white/80 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>

          {/* Powered by badge */}
          <p className="mt-5 text-white/30 text-xs tracking-wider uppercase">
            Powered by{" "}
            <span className="text-white/40 font-medium">Ticketmaster</span>
          </p>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-50">
        <span className="w-5 h-8 border-2 border-white/30 rounded-full flex items-start justify-center p-1">
          <span className="w-1 h-2 bg-white/60 rounded-full animate-bounce" />
        </span>
      </div>
    </section>
  )
}
