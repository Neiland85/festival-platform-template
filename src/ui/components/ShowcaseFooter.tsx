"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"

/* ═══════════════════════════════════════════════════════════════════
   ShowcaseFooter — Clarity Structures Digital SLU
   ─────────────────────────────────────────────────────────────────
   Effects:
   1. Central logo with chromatic aberration split (RGB offset on hover)
   2. Orbiting particles tracing the logo's circle geometry
   3. Holographic shimmer sweep
   4. Magnetic field lines that pulse outward
   5. Glitch scanline micro-effect on hover
   6. Video background subtle reveal
   7. Mouse parallax on the central logo
   8. All respect prefers-reduced-motion
   ═══════════════════════════════════════════════════════════════════ */

/* ── Orbital particle config ── */
type OrbitalParticle = {
  id: number
  orbitRadius: number
  size: number
  speed: number
  startAngle: number
  color: string
  blur: number
  opacity: number
  reverse?: boolean
}

const ORBITAL_PARTICLES: OrbitalParticle[] = [
  // Inner orbit — fast, bright
  { id: 1, orbitRadius: 130, size: 4, speed: 8, startAngle: 0, color: "#3B82F6", blur: 0, opacity: 0.9 },
  { id: 2, orbitRadius: 130, size: 3, speed: 8, startAngle: 120, color: "#60A5FA", blur: 1, opacity: 0.7 },
  { id: 3, orbitRadius: 130, size: 3, speed: 8, startAngle: 240, color: "#93C5FD", blur: 0, opacity: 0.8 },
  // Mid orbit — medium speed, reverse
  { id: 4, orbitRadius: 180, size: 3, speed: 12, startAngle: 30, color: "#2563EB", blur: 1, opacity: 0.6, reverse: true },
  { id: 5, orbitRadius: 180, size: 5, speed: 12, startAngle: 150, color: "#3B82F6", blur: 0, opacity: 0.7, reverse: true },
  { id: 6, orbitRadius: 180, size: 2, speed: 12, startAngle: 270, color: "#60A5FA", blur: 2, opacity: 0.5, reverse: true },
  // Outer orbit — slow, diffused
  { id: 7, orbitRadius: 240, size: 2, speed: 18, startAngle: 60, color: "#1D4ED8", blur: 2, opacity: 0.35 },
  { id: 8, orbitRadius: 240, size: 3, speed: 18, startAngle: 180, color: "#3B82F6", blur: 3, opacity: 0.25 },
  { id: 9, orbitRadius: 240, size: 2, speed: 18, startAngle: 300, color: "#60A5FA", blur: 1, opacity: 0.3 },
  // Elliptical extras
  { id: 10, orbitRadius: 160, size: 2, speed: 15, startAngle: 45, color: "#818CF8", blur: 1, opacity: 0.4 },
  { id: 11, orbitRadius: 200, size: 4, speed: 10, startAngle: 200, color: "#6366F1", blur: 0, opacity: 0.5, reverse: true },
  { id: 12, orbitRadius: 260, size: 2, speed: 22, startAngle: 90, color: "#A5B4FC", blur: 3, opacity: 0.2 },
]

/* ── Magnetic field line config ── */
const FIELD_LINES = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45,
  length: 200 + (i % 3) * 40,
  delay: i * 0.15,
}))

/* ── Keyframes ── */
const STYLES = `
  /* ── Orbital rotation ── */
  @keyframes cl-orbit {
    from { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
  }
  @keyframes cl-orbit-rev {
    from { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
    to   { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
  }

  /* ── Chromatic breathing ── */
  @keyframes cl-chroma-idle {
    0%, 100% { filter: drop-shadow(0 0 20px rgba(59,130,246,0.2)); }
    50%      { filter: drop-shadow(0 0 45px rgba(59,130,246,0.4)); }
  }

  /* ── Holographic shimmer sweep ── */
  @keyframes cl-shimmer {
    0%   { transform: translateX(-200%) rotate(-25deg); }
    100% { transform: translateX(200%) rotate(-25deg); }
  }

  /* ── Magnetic pulse ── */
  @keyframes cl-field-pulse {
    0%   { opacity: 0; transform: rotate(var(--line-angle)) scaleX(0); }
    30%  { opacity: 0.5; }
    100% { opacity: 0; transform: rotate(var(--line-angle)) scaleX(1); }
  }

  /* ── Glitch scanline ── */
  @keyframes cl-glitch-scan {
    0%, 100% { transform: translateY(-100%); opacity: 0; }
    10%  { opacity: 0.15; }
    50%  { opacity: 0.08; }
    90%  { opacity: 0.15; }
    95%  { transform: translateY(100%); opacity: 0; }
  }

  /* ── Breathing ring ── */
  @keyframes cl-ring-breathe {
    0%, 100% { transform: scale(1); opacity: 0.15; }
    50%      { transform: scale(1.08); opacity: 0.3; }
  }

  /* ── Title glow ── */
  @keyframes cl-title-glow {
    0%, 100% { text-shadow: 0 0 20px rgba(59,130,246,0.2); }
    50%      { text-shadow: 0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(99,102,241,0.2); }
  }

  /* ── Video pulse ── */
  @keyframes cl-video-pulse {
    0%, 100% { opacity: 0.06; }
    50%      { opacity: 0.12; }
  }

  /* ── Component classes ── */
  .cl-logo-main {
    animation: cl-chroma-idle 4s ease-in-out infinite;
    transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 600ms ease;
  }
  .cl-footer:hover .cl-logo-main,
  .cl-logo-main.cl-active {
    transform: scale(1.08);
    filter:
      drop-shadow(-3px 0 0 rgba(255,50,50,0.35))
      drop-shadow(3px 0 0 rgba(50,50,255,0.35))
      drop-shadow(0 0 30px rgba(59,130,246,0.5));
  }

  .cl-orbital { will-change: transform; }
  .cl-orbital.cl-running {
    animation-name: cl-orbit;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .cl-orbital.cl-running.cl-reverse {
    animation-name: cl-orbit-rev;
  }

  .cl-shimmer-bar {
    opacity: 0;
    transition: opacity 400ms ease;
  }
  .cl-footer:hover .cl-shimmer-bar,
  .cl-shimmer-bar.cl-active {
    opacity: 1;
    animation: cl-shimmer 2s ease-in-out infinite;
  }

  .cl-field-line {
    opacity: 0;
    transform-origin: left center;
  }
  .cl-footer:hover .cl-field-line,
  .cl-field-line.cl-active {
    animation: cl-field-pulse 2.5s ease-out infinite;
  }

  .cl-glitch-overlay {
    opacity: 0;
    pointer-events: none;
  }
  .cl-footer:hover .cl-glitch-overlay,
  .cl-glitch-overlay.cl-active {
    animation: cl-glitch-scan 3s linear infinite;
  }

  .cl-ring {
    animation: cl-ring-breathe 5s ease-in-out infinite;
  }

  .cl-title {
    animation: cl-title-glow 5s ease-in-out infinite;
    transition: letter-spacing 700ms ease;
  }
  .cl-footer:hover .cl-title,
  .cl-title.cl-active {
    letter-spacing: 0.4em;
  }

  .cl-video-bg {
    animation: cl-video-pulse 6s ease-in-out infinite;
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .cl-logo-main, .cl-orbital, .cl-shimmer-bar, .cl-field-line,
    .cl-glitch-overlay, .cl-ring, .cl-title, .cl-video-bg {
      animation: none !important;
      transition: none !important;
    }
    .cl-footer:hover .cl-logo-main,
    .cl-logo-main.cl-active {
      transform: none;
      filter: drop-shadow(0 0 20px rgba(59,130,246,0.3));
    }
    .cl-orbital.cl-running {
      animation: none !important;
      transform: rotate(var(--start-angle)) translateX(var(--orbit-r)) rotate(calc(-1 * var(--start-angle)));
    }
  }
`

export default function ShowcaseFooter() {
  const t = useTranslations("showcase")
  const [isVisible, setIsVisible] = useState(false)
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  )
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          videoRef.current?.play().catch(() => {})
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const activeClass = isTouch && isVisible ? "cl-active" : ""
  const runClass = isVisible ? "cl-running" : ""

  /* ── Mouse parallax for logo ── */
  const containerRef = useRef<HTMLDivElement>(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setParallax({
      x: ((e.clientX - cx) / rect.width) * 12,
      y: ((e.clientY - cy) / rect.height) * 12,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 })
  }, [])

  return (
    <footer
      ref={sectionRef}
      className="cl-footer group relative overflow-hidden"
      style={{ backgroundColor: "#0A0E1A" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Video background (subtle) ── */}
      <video
        ref={videoRef}
        className="cl-video-bg absolute inset-0 w-full h-full object-cover pointer-events-none"
        src="/clarity_logo2.mp4"
        muted
        loop
        playsInline
        style={{ opacity: 0.08, mixBlendMode: "screen" }}
      />

      {/* ── Deep radial glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.04) 35%, transparent 65%)",
        }}
      />

      {/* ── Noise texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.03,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center py-20 md:py-32 px-6">

        {/* Subtitle */}
        <p
          className="text-xs font-medium tracking-[0.35em] uppercase mb-10"
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {t("hostLabel")}
        </p>

        {/* ── Logo universe container ── */}
        <div
          ref={containerRef}
          className="relative mx-auto"
          style={{ width: 540, height: 540, maxWidth: "90vw", maxHeight: "90vw" }}
        >
          {/* ── Breathing concentric rings ── */}
          {[160, 220, 290].map((r, i) => (
            <div
              key={`ring-${i}`}
              className="cl-ring absolute rounded-full pointer-events-none"
              style={{
                width: r * 2,
                height: r * 2,
                left: "50%",
                top: "50%",
                marginLeft: -r,
                marginTop: -r,
                border: `1px solid rgba(59,130,246,${0.12 - i * 0.03})`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}

          {/* ── Magnetic field lines ── */}
          {FIELD_LINES.map((fl, i) => (
            <div
              key={`field-${i}`}
              className={`cl-field-line absolute ${activeClass}`}
              style={{
                left: "50%",
                top: "50%",
                width: fl.length,
                height: 1,
                background: "linear-gradient(90deg, rgba(59,130,246,0.4), transparent)",
                "--line-angle": `${fl.angle}deg`,
                animationDelay: `${fl.delay}s`,
              } as React.CSSProperties}
            />
          ))}

          {/* ── Orbital particles ── */}
          {ORBITAL_PARTICLES.map((p) => (
            <div
              key={`orb-${p.id}`}
              className={`cl-orbital absolute ${runClass} ${p.reverse ? "cl-reverse" : ""}`}
              style={{
                left: "50%",
                top: "50%",
                width: p.size,
                height: p.size,
                marginLeft: -(p.size / 2),
                marginTop: -(p.size / 2),
                "--orbit-r": `${p.orbitRadius}px`,
                "--start-angle": `${p.startAngle}deg`,
                animationDuration: `${p.speed}s`,
                animationDelay: `${-(p.startAngle / 360) * p.speed}s`,
              } as React.CSSProperties}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  backgroundColor: p.color,
                  opacity: p.opacity,
                  filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
                  boxShadow: `0 0 ${6 + p.size * 2}px ${p.color}`,
                }}
              />
            </div>
          ))}

          {/* ── Central logo with chromatic aberration ── */}
          <div
            className="absolute left-1/2 top-1/2 z-10"
            style={{
              transform: `translate(-50%, -50%) translate(${parallax.x}px, ${parallax.y}px)`,
              transition: "transform 150ms ease-out",
            }}
          >
            {/* Holographic shimmer sweep */}
            <div
              className="absolute overflow-hidden rounded-full pointer-events-none z-20"
              style={{ width: 220, height: 220 }}
            >
              <div
                className={`cl-shimmer-bar absolute ${activeClass}`}
                style={{
                  background:
                    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 45%, rgba(59,130,246,0.08) 50%, rgba(255,255,255,0.12) 55%, transparent 70%)",
                  width: "200%",
                  height: "200%",
                  top: "-50%",
                  left: "-50%",
                }}
              />
            </div>

            {/* Glitch scanline overlay */}
            <div
              className={`cl-glitch-overlay absolute z-20 ${activeClass}`}
              style={{
                width: 220,
                height: 220,
                background:
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(59,130,246,0.06) 2px, rgba(59,130,246,0.06) 4px)",
              }}
            />

            {/* Logo image */}
            <div
              className={`cl-logo-main ${activeClass}`}
              style={{ width: 220, height: 220 }}
            >
              <Image
                src="/clarity-logo-dark.png"
                alt="Clarity Structures Digital SLU"
                width={220}
                height={220}
                sizes="220px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <h2
          className={`cl-title mt-6 text-2xl md:text-4xl font-bold tracking-[0.25em] uppercase text-center ${activeClass}`}
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "#ffffff",
          }}
        >
          Clarity Structures
        </h2>

        {/* ── Subtitle ── */}
        <p
          className="mt-2 text-sm md:text-base tracking-[0.15em] uppercase"
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "rgba(59,130,246,0.6)",
          }}
        >
          Digital SLU
        </p>

        {/* ── Gradient horizon line ── */}
        <div
          className="mt-8 w-56 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #3B82F6, #6366F1, #3B82F6, transparent)",
          }}
        />

        {/* ── Tagline ── */}
        <p
          className="mt-5 text-xs tracking-[0.2em] uppercase"
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {t("tagline")}
        </p>
      </div>

      {/* ── Site credit ── */}
      <div className="site-credit">
        <span>{t("credit")}</span>
      </div>
    </footer>
  )
}
