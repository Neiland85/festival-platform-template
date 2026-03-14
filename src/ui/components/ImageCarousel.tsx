"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Image from "next/image"

const slides = [
  "/carousel/carousel-01.webp",
  "/carousel/carousel-02.webp",
  "/carousel/carousel-03.webp",
  "/carousel/carousel-04.webp",
  "/carousel/carousel-05.webp",
  "/carousel/carousel-06.webp",
  "/carousel/carousel-07.webp",
  "/carousel/carousel-08.webp",
  "/carousel/carousel-09.webp",
  "/carousel/carousel-10.webp",
]

const AUTO_INTERVAL = 4000

export default function ImageCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef(0)

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    const id = setInterval(next, AUTO_INTERVAL)
    return () => clearInterval(id)
  }, [next, paused])

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (touch) touchStartX.current = touch.clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const touch = e.changedTouches[0]
    if (!touch) return
    const diff = touchStartX.current - touch.clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
  }

  return (
    <section
      className="relative w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides container */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((src, i) => (
          <div key={src} className="relative w-full shrink-0 aspect-[2.4/1]">
            <Image
              src={src}
              alt={`Solaris Nerja — carrusel ${i + 1}`}
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-black/30 hover:bg-black/60 text-white rounded-full transition"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M12 4L6 10L12 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-black/30 hover:bg-black/60 text-white rounded-full transition"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M8 4L14 10L8 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Diapositiva ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "bg-white w-5" : "bg-white/40 w-1.5"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
