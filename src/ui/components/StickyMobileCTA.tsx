"use client"

import { useEffect, useState } from "react"

/**
 * StickyMobileCTA — Floating bottom CTA visible only on mobile (< 640px)
 * when #programacion section is in viewport.
 *
 * Shows a simplified brand-styled "Entradas" button that triggers the
 * first available event's onSelect (or a provided callback).
 *
 * Uses IntersectionObserver (no scroll listeners) for performance.
 * Respects safe-area-inset-bottom.
 */

type Props = {
  /** Label shown in the sticky CTA */
  label?: string
  /** Callback when the sticky CTA is tapped */
  onTap: () => void
  /** CSS selector of the section to observe for visibility */
  observeSelector?: string
}

export default function StickyMobileCTA({
  label = "Ver programación",
  onTap,
  observeSelector = "#programacion",
}: Props) {
  const [sectionVisible, setSectionVisible] = useState(false)

  useEffect(() => {
    const el = document.querySelector(observeSelector)
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry) setSectionVisible(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [observeSelector])

  return (
    <div
      className="sticky-mobile-cta sm:hidden fixed z-40 left-0 right-0 flex justify-center pointer-events-none"
      style={{
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        opacity: sectionVisible ? 1 : 0,
        transform: sectionVisible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 250ms ease, transform 250ms ease",
      }}
    >
      <button
        type="button"
        onClick={onTap}
        className="pointer-events-auto flex items-center gap-2 px-6 shadow-lg"
        style={{
          backgroundColor: "var(--sn-solar, #FF3300)",
          color: "#fff",
          fontFamily: "var(--font-space-mono, 'Space Mono', monospace)",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          minHeight: 48,
          borderRadius: 24,
        }}
        aria-label={label}
      >
        {/* Mini sun icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="8" r="5" fill="#fff" opacity="0.9" />
          <line x1="2" y1="14" x2="16" y2="14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>
        {label}
      </button>
    </div>
  )
}
