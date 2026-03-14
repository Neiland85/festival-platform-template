"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"

/* ── Burst logo config ── */
type BurstLogo = {
  id: number
  tx: number
  ty: number
  rotate: number
  scale: number
  filter: string
  opacity: number
  delay: number
  blendMode?: string
  size: number
}

const BURST_LOGOS: BurstLogo[] = [
  // Inner ring — closer, larger
  { id: 1, tx: -140, ty: -120, rotate: -15, scale: 0.55, filter: "grayscale(1)", opacity: 0.55, delay: 0, size: 90 },
  { id: 2, tx: 160, ty: -100, rotate: 12, scale: 0.5, filter: "hue-rotate(220deg) saturate(1.8)", opacity: 0.45, delay: 50, blendMode: "screen", size: 85 },
  { id: 3, tx: -180, ty: 60, rotate: -25, scale: 0.45, filter: "brightness(1.5) contrast(0.8)", opacity: 0.4, delay: 100, size: 80 },
  { id: 4, tx: 190, ty: 80, rotate: 20, scale: 0.4, filter: "invert(1) hue-rotate(180deg)", opacity: 0.3, delay: 70, blendMode: "difference", size: 75 },
  { id: 5, tx: -50, ty: -160, rotate: 8, scale: 0.5, filter: "sepia(1) hue-rotate(-30deg) saturate(2)", opacity: 0.45, delay: 120, size: 88 },
  { id: 6, tx: 60, ty: 150, rotate: -10, scale: 0.45, filter: "blur(2px) brightness(1.3)", opacity: 0.35, delay: 90, size: 78 },
  // Outer ring — farther, smaller, wilder treatments
  { id: 7, tx: -260, ty: -60, rotate: 35, scale: 0.35, filter: "grayscale(1) brightness(2)", opacity: 0.22, delay: 150, size: 60 },
  { id: 8, tx: 280, ty: -40, rotate: -30, scale: 0.3, filter: "hue-rotate(90deg) saturate(3)", opacity: 0.28, delay: 180, blendMode: "overlay", size: 55 },
  { id: 9, tx: -220, ty: 140, rotate: 45, scale: 0.28, filter: "blur(3px)", opacity: 0.18, delay: 200, size: 50 },
  { id: 10, tx: 240, ty: 160, rotate: -40, scale: 0.3, filter: "invert(1) brightness(0.8)", opacity: 0.2, delay: 170, blendMode: "exclusion", size: 55 },
  { id: 11, tx: 0, ty: -200, rotate: 15, scale: 0.32, filter: "sepia(0.8) contrast(1.4)", opacity: 0.25, delay: 220, size: 58 },
  { id: 12, tx: -300, ty: 0, rotate: -50, scale: 0.25, filter: "hue-rotate(300deg) blur(1px)", opacity: 0.16, delay: 250, size: 48 },
  { id: 13, tx: 310, ty: 20, rotate: 55, scale: 0.22, filter: "grayscale(0.5) hue-rotate(45deg)", opacity: 0.18, delay: 230, blendMode: "soft-light", size: 45 },
  { id: 14, tx: 30, ty: 200, rotate: -20, scale: 0.3, filter: "brightness(0.5) sepia(1)", opacity: 0.2, delay: 200, size: 52 },
]

/* ── Keyframes ── */
const STYLES = `
  @keyframes sn-burst {
    0% {
      opacity: 0;
      transform: translate(0, 0) rotate(0deg) scale(0.1);
    }
    40% { opacity: var(--b-op, 0.4); }
    100% {
      opacity: var(--b-op, 0.4);
      transform:
        translate(var(--b-tx, 0px), var(--b-ty, 0px))
        rotate(var(--b-r, 0deg))
        scale(var(--b-s, 0.4));
    }
  }

  @keyframes sn-breathe {
    0%, 100% { filter: drop-shadow(0 0 20px rgba(255,51,0,0.15)); }
    50%      { filter: drop-shadow(0 0 50px rgba(255,51,0,0.4)); }
  }

  @keyframes sn-glow-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%      { opacity: 0.55; transform: scale(1.06); }
  }

  .sn-hero-logo {
    animation: sn-breathe 4s ease-in-out infinite;
    transition: transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .group:hover .sn-hero-logo,
  .sn-hero-logo.sn-active { transform: scale(1.1); }

  .sn-glow { animation: sn-glow-pulse 5s ease-in-out infinite; }

  .sn-burst-item {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg) scale(0.1);
    will-change: transform, opacity;
  }
  .group:hover .sn-burst-item,
  .sn-burst-item.sn-active {
    animation: sn-burst 700ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    animation-delay: var(--b-delay, 0ms);
  }

  .sn-title {
    transition: text-shadow 700ms ease, letter-spacing 700ms ease;
  }
  .group:hover .sn-title,
  .sn-title.sn-active {
    text-shadow: 0 0 40px rgba(255,51,0,0.5), 0 0 80px rgba(255,51,0,0.2), 0 0 120px rgba(65,65,198,0.15);
    letter-spacing: 0.35em;
  }

  @media (prefers-reduced-motion: reduce) {
    .sn-hero-logo { animation: none !important; transition: none !important; }
    .sn-glow { animation: none !important; }
    .sn-burst-item { animation: none !important; }
    .sn-title { transition: none !important; }
    .group:hover .sn-burst-item,
    .sn-burst-item.sn-active {
      animation: none !important;
      opacity: var(--b-op, 0.3);
      transform:
        translate(var(--b-tx, 0px), var(--b-ty, 0px))
        rotate(var(--b-r, 0deg))
        scale(var(--b-s, 0.4));
    }
  }
`

/* ── Star dots (decorative) ── */
const STARS = Array.from({ length: 25 }, (_, i) => ({
  w: 1 + (i % 2),
  color: `hsl(${20 + (i % 30)}, ${50 + (i % 30)}%, ${70 + (i % 20)}%)`,
  top: `${5 + ((i * 5.7) % 90)}%`,
  left: `${3 + ((i * 7.3) % 94)}%`,
}))

export default function SolarisShowcaseFooter() {
  const [isVisible, setIsVisible] = useState(false)
  const [isTouch] = useState(
    () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  )
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setIsVisible(true) },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const activeClass = isTouch && isVisible ? "sn-active" : ""

  const burstLogos = isTouch
    ? BURST_LOGOS.slice(0, 8).map(b => ({
        ...b,
        tx: Math.round(b.tx * 0.5),
        ty: Math.round(b.ty * 0.5),
        size: Math.round(b.size * 0.7),
      }))
    : BURST_LOGOS

  return (
    <footer
      ref={sectionRef}
      className="group relative overflow-hidden"
      style={{ backgroundColor: "#0A0E1A" }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Atmospheric radial glow ── */}
      <div
        className="absolute inset-0 pointer-events-none sn-glow"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255,51,0,0.12) 0%, rgba(65,65,198,0.04) 40%, transparent 70%)",
        }}
      />

      {/* ── Star dots ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15 }}>
        {STARS.map((s, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              width: s.w,
              height: s.w,
              backgroundColor: s.color,
              top: s.top,
              left: s.left,
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center py-20 md:py-28 px-6">

        {/* Subtitle */}
        <p
          className="text-xs font-medium tracking-[0.3em] uppercase mb-8"
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Anfitri&oacute;n del festival
        </p>

        {/* ── Burst container ── */}
        <div
          className="relative mx-auto"
          style={{ width: 600, height: 400, maxWidth: "90vw" }}
        >
          {/* Burst logos */}
          {burstLogos.map((b) => (
            <div
              key={b.id}
              className={`sn-burst-item absolute ${activeClass}`}
              aria-hidden="true"
              style={{
                left: "50%",
                top: "50%",
                width: b.size,
                height: b.size,
                marginLeft: -(b.size / 2),
                marginTop: -(b.size / 2),
                filter: b.filter,
                mixBlendMode: (b.blendMode ?? "normal") as React.CSSProperties["mixBlendMode"],
                "--b-tx": `${b.tx}px`,
                "--b-ty": `${b.ty}px`,
                "--b-r": `${b.rotate}deg`,
                "--b-s": String(b.scale),
                "--b-op": String(b.opacity),
                "--b-delay": `${b.delay}ms`,
              } as React.CSSProperties}
            >
              <Image
                src="/logo-solaris.png"
                alt=""
                width={b.size}
                height={b.size}
                sizes={`${b.size}px`}
                className="object-contain"
              />
            </div>
          ))}

          {/* ── Hero logo (centered, on top) ── */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div
              className={`sn-hero-logo ${activeClass}`}
              style={{ width: 240, height: 240 }}
            >
              <Image
                src="/logo-solaris.png"
                alt="Solaris Nerja"
                width={240}
                height={240}
                sizes="240px"
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <h2
          className={`sn-title mt-8 text-3xl md:text-5xl font-bold tracking-[0.25em] uppercase text-center ${activeClass}`}
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "#ffffff",
          }}
        >
          Solaris Nerja
        </h2>

        {/* ── Gradient horizon line ── */}
        <div
          className="mt-6 w-48 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #FF3300, #4141C6, transparent)",
          }}
        />

        {/* ── Tagline ── */}
        <p
          className="mt-4 text-xs tracking-[0.2em] uppercase"
          style={{
            fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          Mediterranean Light Culture
        </p>
      </div>

      {/* ── Site credit (existing .site-credit styles from globals.css) ── */}
      <div className="site-credit">
        <span>Website Code by Clarity Structures Digital S.L.</span>
      </div>
    </footer>
  )
}
