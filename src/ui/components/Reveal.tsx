"use client"

import { useCallback, useRef } from "react"

type Props = {
  children: React.ReactNode
  className?: string
  delayMs?: number
}

/**
 * Reveal-on-scroll component.
 *
 * Uses a ref callback to set up IntersectionObserver.
 * Elements above the fold render immediately (no animation).
 * Elements below the fold fade-in + slide-up when scrolled into view.
 */
export function Reveal({ children, className = "", delayMs = 0 }: Props) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (!el) return

      // Check if element is already in viewport (above fold)
      const rect = el.getBoundingClientRect()
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0

      if (inViewport) {
        // Already visible — render normally, no animation
        el.style.opacity = "1"
        el.style.transform = "translateY(0)"
        return
      }

      // Below fold: start hidden, animate on scroll
      el.style.opacity = "0"
      el.style.transform = "translateY(1.5rem)"
      el.style.transition = `all 700ms ease-out`
      if (delayMs) {
        el.style.transitionDelay = `${delayMs}ms`
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry && entry.isIntersecting) {
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
            observer.disconnect()
          }
        },
        { threshold: 0.15 }
      )

      observer.observe(el)
      observerRef.current = observer
    },
    [delayMs]
  )

  return (
    <div ref={refCallback} className={className}>
      {children}
    </div>
  )
}
