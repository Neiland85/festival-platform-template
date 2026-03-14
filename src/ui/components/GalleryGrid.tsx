"use client"

import { useCallback, useRef } from "react"
import Image from "next/image"

const images = [
  "/gallery/gallery-01.webp",
  "/gallery/gallery-02.webp",
  "/gallery/gallery-03.webp",
  "/gallery/gallery-04.webp",
  "/gallery/gallery-05.webp",
  "/gallery/gallery-06.webp",
  "/gallery/gallery-07.webp",
  "/gallery/gallery-08.webp",
  "/gallery/gallery-09.webp",
  "/gallery/gallery-10.webp",
]

function RevealItem({ children, delay }: { children: React.ReactNode; delay: number }) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!el) return

      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.style.opacity = "1"
        el.style.transform = "translateY(0) scale(1)"
        return
      }

      el.style.opacity = "0"
      el.style.transform = "translateY(2rem) scale(0.97)"
      el.style.transition = "all 600ms ease-out"
      el.style.transitionDelay = `${delay}ms`

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry && entry.isIntersecting) {
            el.style.opacity = "1"
            el.style.transform = "translateY(0) scale(1)"
            observer.disconnect()
          }
        },
        { threshold: 0.1 },
      )

      observer.observe(el)
      observerRef.current = observer
    },
    [delay],
  )

  return <div ref={refCallback}>{children}</div>
}

export default function GalleryGrid() {
  return (
    <section id="galeria" className="section-editorial px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="editorial-label mb-3">momentos</p>
          <h2 className="editorial-h2">galería</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {images.map((src, i) => (
            <RevealItem key={src} delay={(i % 4) * 80}>
              <div className="relative aspect-square overflow-hidden rounded-sm group">
                <Image
                  src={src}
                  alt={`Galería Solaris Nerja — foto ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            </RevealItem>
          ))}
        </div>
      </div>
    </section>
  )
}
