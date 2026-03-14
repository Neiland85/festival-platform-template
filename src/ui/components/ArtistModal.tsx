"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import Image from "next/image"

/**
 * ArtistModal — Fullscreen immersive modal with hero image.
 *
 * Mobile (< 640px):
 *   - Full-viewport sheet sliding up from bottom
 *   - Drag-handle pill — drag >= 80px down to close
 *   - Safe-area padding (env(safe-area-inset-bottom))
 *   - Large touch targets (min 48px)
 *
 * Desktop (>= 640px):
 *   - Fullscreen overlay with centered max-w-2xl content
 *   - Scroll for overflow
 *
 * Transitions (CSS-only, no libs):
 *   1. Backdrop fade + blur (300ms)
 *   2. Sheet slides up (400ms cubic-bezier)
 *   3. Hero image scale-in (600ms)
 *   4. Content staggered fade-in (120ms per element)
 *   5. CTA pulse on arrival
 *   6. Exit reverses all (280ms)
 *
 * A11y: focus-trap, ESC closes, click-outside closes, aria-modal,
 *       prefers-reduced-motion kills all motion.
 */

export type ArtistModalProps = {
  open: boolean
  onClose: () => void
  artist: {
    id: string
    title: string
    description: string
    highlight: string
    ticketUrl: string
    time?: string
    logo?: string
  } | null
  /** Full-bleed hero image for the artist */
  artistImage?: string
  /** CSS object-position for the hero image */
  artistImagePosition?: string
}

/* -- Durations (ms) -- */
const BACKDROP_MS = 300
const SLIDE_MS = 400
const HERO_SCALE_MS = 600
const STAGGER_BASE_MS = 120
const EXIT_MS = 280
const DRAG_CLOSE_THRESHOLD = 80

export default function ArtistModal({
  open,
  onClose,
  artist,
  artistImage,
  artistImagePosition,
}: ArtistModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  /* -- Drag-to-close state (touch only) -- */
  const dragState = useRef({ startY: 0, currentY: 0, dragging: false })
  const [dragOffset, setDragOffset] = useState(0)

  /* -- Mount / animate-in / animate-out -- */
  useEffect(() => {
    if (open && artist) {
      const mountFrame = requestAnimationFrame(() => {
        setMounted(true)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setVisible(true))
        })
      })
      return () => cancelAnimationFrame(mountFrame)
    } else if (!open && mounted) {
      const hideFrame = requestAnimationFrame(() => setVisible(false))
      const t = setTimeout(() => setMounted(false), EXIT_MS)
      return () => {
        cancelAnimationFrame(hideFrame)
        clearTimeout(t)
      }
    }
  }, [open, artist, mounted])

  /* -- Focus management -- */
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => closeRef.current?.focus(), SLIDE_MS)
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = ""
    }
  }, [visible])

  /* -- ESC key + focus trap -- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
      if (e.key === "Tab" && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose],
  )

  /* -- Click outside -- */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  /* -- Touch drag handlers (mobile) -- */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    dragState.current = { startY: touch.clientY, currentY: touch.clientY, dragging: true }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.dragging) return
    const touch = e.touches[0]
    if (!touch) return
    dragState.current.currentY = touch.clientY
    const dy = Math.max(0, touch.clientY - dragState.current.startY)
    setDragOffset(dy)
  }, [])

  const handleTouchEnd = useCallback(() => {
    const dy = dragState.current.currentY - dragState.current.startY
    dragState.current.dragging = false
    if (dy >= DRAG_CLOSE_THRESHOLD) {
      onClose()
    }
    setDragOffset(0)
  }, [onClose])

  if (!mounted || !artist) return null

  const hasRealUrl = artist.ticketUrl && artist.ticketUrl !== "#"
  const heroSrc = artistImage ?? artist.logo

  /* -- Stagger helper -- */
  const stagger = (n: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    transition: `opacity ${STAGGER_BASE_MS}ms ease, transform ${STAGGER_BASE_MS}ms ease`,
    transitionDelay: visible ? `${SLIDE_MS + HERO_SCALE_MS * 0.4 + n * STAGGER_BASE_MS}ms` : "0ms",
  })

  /* -- Sheet transform (accounts for drag offset) -- */
  const sheetTransform = visible
    ? `translateY(${dragOffset}px)`
    : "translateY(100%)"

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Información de ${artist.title}`}
      className="artist-modal-overlay fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(12px)" : "blur(0px)",
        WebkitBackdropFilter: visible ? "blur(12px)" : "blur(0px)",
        transition: dragOffset > 0
          ? "none"
          : `background-color ${BACKDROP_MS}ms ease, backdrop-filter ${BACKDROP_MS}ms ease, -webkit-backdrop-filter ${BACKDROP_MS}ms ease`,
      }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      {/* -- Sheet -- */}
      <div
        ref={sheetRef}
        className="artist-modal-sheet relative w-full sm:max-w-2xl overflow-y-auto overscroll-contain"
        style={{
          fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          opacity: visible ? 1 : 0,
          transform: sheetTransform,
          transition: dragOffset > 0
            ? "none"
            : `opacity ${SLIDE_MS}ms cubic-bezier(.16,1,.3,1), transform ${SLIDE_MS}ms cubic-bezier(.16,1,.3,1)`,
          maxHeight: "100dvh",
          borderRadius: "16px 16px 0 0",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* -- Drag handle (mobile) -- */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing relative z-20">
          <div
            className="rounded-full"
            style={{ width: 36, height: 4, backgroundColor: "rgba(255,255,255,0.3)" }}
          />
        </div>

        {/* -- Close button -- */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 z-30 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#ffffff",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="4" x2="14" y2="14" />
            <line x1="14" y1="4" x2="4" y2="14" />
          </svg>
        </button>

        {/* -- Hero image zone -- */}
        {heroSrc && (
          <div
            className="relative w-full overflow-hidden"
            style={{ height: "clamp(240px, 50vh, 420px)" }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: visible ? "scale(1)" : "scale(1.1)",
                opacity: visible ? 1 : 0,
                transition: `transform ${HERO_SCALE_MS}ms cubic-bezier(.16,1,.3,1) ${SLIDE_MS * 0.5}ms, opacity ${HERO_SCALE_MS * 0.6}ms ease ${SLIDE_MS * 0.5}ms`,
              }}
            >
              <Image
                src={heroSrc}
                alt={artist.title}
                fill
                sizes="(max-width: 640px) 100vw, 672px"
                className="object-cover"
                style={{ objectPosition: artistImagePosition ?? "center 25%" }}
                priority
              />
            </div>

            {/* Gradient overlay: bottom fade to content */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.6) 40%, rgba(10,10,10,0.1) 70%, transparent 100%)",
              }}
            />

            {/* Artist name overlaid on hero */}
            <div
              className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 pb-4"
              style={stagger(0)}
            >
              {artist.time && (
                <p
                  className="text-xs tracking-[0.3em] uppercase mb-2"
                  style={{ color: "var(--sn-solar, #FF3300)" }}
                >
                  {artist.time}
                </p>
              )}
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                {artist.title}
              </h2>
            </div>
          </div>
        )}

        {/* -- Content section -- */}
        <div
          className="px-6 sm:px-8 space-y-6"
          style={{ paddingTop: heroSrc ? "1.5rem" : "4rem", paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* No hero image: show title here instead */}
          {!heroSrc && (
            <div style={stagger(0)}>
              {artist.time && (
                <p
                  className="text-xs tracking-[0.3em] uppercase mb-2"
                  style={{ color: "var(--sn-solar, #FF3300)" }}
                >
                  {artist.time}
                </p>
              )}
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {artist.title}
              </h2>
            </div>
          )}

          {/* Highlight tag */}
          <div style={stagger(1)}>
            <span
              className="inline-block px-3 py-1 text-xs tracking-[0.2em] uppercase rounded-full"
              style={{
                backgroundColor: "rgba(255,51,0,0.15)",
                color: "var(--sn-solar, #FF3300)",
                border: "1px solid rgba(255,51,0,0.25)",
              }}
            >
              {artist.highlight}
            </span>
          </div>

          {/* Description */}
          <p
            className="text-sm sm:text-base leading-relaxed"
            style={{
              color: "rgba(255,255,255,0.65)",
              ...stagger(2),
            }}
          >
            {artist.description}
          </p>

          {/* Horizon divider */}
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--sn-solar, #FF3300), var(--sn-deep-blue, #4141C6), transparent)",
              ...stagger(3),
            }}
          />

          {/* CTA */}
          <div style={stagger(4)}>
            {hasRealUrl ? (
              <a
                href={artist.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="artist-modal-cta block w-full text-center py-4 text-sm font-bold tracking-widest uppercase transition-colors rounded"
                style={{
                  backgroundColor: "var(--sn-solar, #FF3300)",
                  color: "#fff",
                  minHeight: 48,
                  lineHeight: "48px",
                  paddingTop: 0,
                  paddingBottom: 0,
                  animation: visible
                    ? `artistModalPulse 500ms ${SLIDE_MS + HERO_SCALE_MS * 0.4 + 4 * STAGGER_BASE_MS + 100}ms ease both`
                    : "none",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--sn-deep-blue, #4141C6)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--sn-solar, #FF3300)"
                }}
              >
                Comprar entradas
              </a>
            ) : (
              <a
                href={`/eventos/${artist.id}`}
                className="block w-full text-center py-4 text-sm font-bold tracking-widest uppercase border-2 transition-colors rounded"
                style={{
                  borderColor: "rgba(255,255,255,0.3)",
                  color: "#ffffff",
                  minHeight: 48,
                }}
              >
                Más información
              </a>
            )}
          </div>

          {/* Micro brand */}
          <p
            className="text-center text-xs tracking-widest uppercase"
            style={{
              color: "rgba(255,255,255,0.15)",
              ...stagger(5),
            }}
          >
            Solaris Nerja
          </p>
        </div>
      </div>
    </div>
  )
}
