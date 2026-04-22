"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * ClarityCursor — Custom cursor with spinning Clarity logo + shockwave on click.
 *
 * Features:
 * - Logo follows mouse with smooth lerp (linear interpolation)
 * - Continuous 360° rotation (CSS animation)
 * - Click triggers expanding shockwave ring with fade-out
 * - Hides default cursor across the page
 * - Disabled on touch devices (no cursor needed)
 */

// Clarity logo SVG — two interlocking arcs (brand mark)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="%232563eb" stroke-width="2.5" stroke-linecap="round">
  <path d="M12 32 C12 18 22 8 36 8 C42 8 47 10 50 14"/>
  <path d="M52 32 C52 46 42 56 28 56 C22 56 17 54 14 50"/>
  <circle cx="32" cy="32" r="14" stroke-width="2"/>
</svg>`

const CURSOR_SIZE = 40

export default function ClarityCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const shockwavesRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: -100, y: -100 })
  const targetRef = useRef({ x: -100, y: -100 })
  const rafRef = useRef<number>(0)

  // Smooth follow with lerp
  const animate = useCallback(() => {
    const lerp = 0.15
    posRef.current.x += (targetRef.current.x - posRef.current.x) * lerp
    posRef.current.y += (targetRef.current.y - posRef.current.y) * lerp

    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate(${posRef.current.x - CURSOR_SIZE / 2}px, ${posRef.current.y - CURSOR_SIZE / 2}px)`
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    // Skip on touch devices
    if (typeof window !== "undefined" && "ontouchstart" in window) return

    const handleMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleClick = (e: MouseEvent) => {
      spawnShockwave(e.clientX, e.clientY)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("click", handleClick)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("click", handleClick)
      cancelAnimationFrame(rafRef.current)
    }
  }, [animate])

  const spawnShockwave = (x: number, y: number) => {
    if (!shockwavesRef.current) return

    const ring = document.createElement("div")
    ring.className = "shockwave-ring"
    ring.style.left = `${x}px`
    ring.style.top = `${y}px`
    shockwavesRef.current.appendChild(ring)

    // Clean up after animation
    ring.addEventListener("animationend", () => ring.remove())
  }

  return (
    <>
      {/* Global cursor override */}
      <style>{`
        * { cursor: none !important; }

        @keyframes clarity-spin {
          from { rotate: 0deg; }
          to   { rotate: 360deg; }
        }

        @keyframes shockwave-expand {
          0% {
            width: 0px;
            height: 0px;
            opacity: 0.8;
            border-width: 3px;
          }
          50% {
            opacity: 0.4;
            border-width: 2px;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
            border-width: 1px;
          }
        }

        .shockwave-ring {
          position: fixed;
          border-radius: 50%;
          border: 3px solid rgba(37, 99, 235, 0.7);
          pointer-events: none;
          z-index: 99998;
          transform: translate(-50%, -50%);
          animation: shockwave-expand 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          box-shadow:
            0 0 20px rgba(37, 99, 235, 0.3),
            inset 0 0 20px rgba(37, 99, 235, 0.1);
        }
      `}</style>

      {/* Cursor element */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          pointerEvents: "none",
          zIndex: 99999,
          animation: "clarity-spin 4s linear infinite",
          willChange: "transform",
          filter: "drop-shadow(0 0 8px rgba(37, 99, 235, 0.5))",
          backgroundImage: `url("data:image/svg+xml,${LOGO_SVG}")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Shockwave container */}
      <div
        ref={shockwavesRef}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99998 }}
      />
    </>
  )
}
