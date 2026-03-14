"use client"

import { useEffect, useState } from "react"

export default function SolarOrb() {
  const [y, setY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setY(window.scrollY * 0.2)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      style={{ transform: `translateY(${y}px)` }}
      className="fixed left-1/2 top-32 -translate-x-1/2 pointer-events-none z-0"
    >
      <div className="w-64 h-64 rounded-full bg-[rgba(255,150,80,0.12)] blur-3xl" />
    </div>
  )
}
