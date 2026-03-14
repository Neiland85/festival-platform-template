"use client"

import { useState, useEffect, useCallback, useRef } from "react"

/**
 * useSolarisTheme — Golden Hour Mode for SolarisNerja.
 *
 * Dynamically switches CSS variables based on user's local time:
 *   Before 17:00  → "day"    (bright editorial whites)
 *   17:00–20:00   → "sunset" (warm golden gradients)
 *   After 20:00   → "night"  (deep Mediterranean blues)
 *
 * - Injects CSS variables on <html> element for global cascade.
 * - Checks time every 60s (no excessive timers).
 * - Smooth transition via CSS `transition` on :root (set in globals.css).
 * - SSR-safe: returns "day" during server render, hydrates client-side.
 * - prefers-color-scheme: dark overrides to "night" mode regardless of time.
 */

export type SolarisTheme = "day" | "sunset" | "night"

export type SolarisThemeTokens = {
  "--sn-bg": string
  "--sn-surface": string
  "--sn-surface-2": string
  "--sn-text": string
  "--sn-muted": string
  "--sn-solar": string
  "--sn-solar-glow": string
  "--sn-deep-blue": string
  "--sn-deep-blue-light": string
  "--sn-border": string
  "--sn-border-2": string
}

const THEMES: Record<SolarisTheme, SolarisThemeTokens> = {
  day: {
    "--sn-bg": "#ffffff",
    "--sn-surface": "#f5f5f5",
    "--sn-surface-2": "#ebebeb",
    "--sn-text": "#0a0a0a",
    "--sn-muted": "#717171",
    "--sn-solar": "#FF3300",
    "--sn-solar-glow": "#FF5C33",
    "--sn-deep-blue": "#4141C6",
    "--sn-deep-blue-light": "#5C5CD6",
    "--sn-border": "rgba(0, 0, 0, 0.08)",
    "--sn-border-2": "rgba(0, 0, 0, 0.16)",
  },
  sunset: {
    "--sn-bg": "#FFF8F0",
    "--sn-surface": "#FFF0E0",
    "--sn-surface-2": "#FFE4CC",
    "--sn-text": "#1A0A00",
    "--sn-muted": "#8B5E3C",
    "--sn-solar": "#FF4500",
    "--sn-solar-glow": "#FF6B33",
    "--sn-deep-blue": "#5C3DA6",
    "--sn-deep-blue-light": "#7B5FC7",
    "--sn-border": "rgba(255, 69, 0, 0.1)",
    "--sn-border-2": "rgba(255, 69, 0, 0.18)",
  },
  night: {
    "--sn-bg": "#0A0E1A",
    "--sn-surface": "#111827",
    "--sn-surface-2": "#1A2236",
    "--sn-text": "#E8E8ED",
    "--sn-muted": "#8B8FA3",
    "--sn-solar": "#FF5C33",
    "--sn-solar-glow": "#FF7A57",
    "--sn-deep-blue": "#6B6BFF",
    "--sn-deep-blue-light": "#8585FF",
    "--sn-border": "rgba(255, 255, 255, 0.08)",
    "--sn-border-2": "rgba(255, 255, 255, 0.16)",
  },
}

function getThemeForHour(hour: number): SolarisTheme {
  if (hour < 17) return "day"
  if (hour < 20) return "sunset"
  return "night"
}

export function useSolarisTheme() {
  const [theme, setTheme] = useState<SolarisTheme>("day")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const detectTheme = useCallback((): SolarisTheme => {
    // prefers-color-scheme: dark overrides time-based detection
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "night"
    }
    const hour = new Date().getHours()
    return getThemeForHour(hour)
  }, [])

  const applyTokens = useCallback((t: SolarisTheme) => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const tokens = THEMES[t]
    for (const [prop, value] of Object.entries(tokens)) {
      root.style.setProperty(prop, value)
    }
    // Set data attribute for conditional CSS selectors
    root.dataset["solarisTheme"] = t
  }, [])

  useEffect(() => {
    // Apply tokens immediately (DOM mutation — safe in effects)
    const initial = detectTheme()
    applyTokens(initial)

    // Defer state sync to avoid synchronous setState in effect body
    const initTimer = setTimeout(() => setTheme(initial), 0)

    // Re-check every 60 seconds
    intervalRef.current = setInterval(() => {
      const next = detectTheme()
      setTheme((prev) => {
        if (prev !== next) {
          applyTokens(next)
          return next
        }
        return prev
      })
    }, 60_000)

    // Listen for OS dark mode changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onMediaChange = () => {
      const next = detectTheme()
      setTheme(next)
      applyTokens(next)
    }
    mq.addEventListener("change", onMediaChange)

    return () => {
      clearTimeout(initTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
      mq.removeEventListener("change", onMediaChange)
    }
  }, [detectTheme, applyTokens])

  return {
    /** Current active theme: "day" | "sunset" | "night" */
    theme,
    /** All token values for the current theme */
    tokens: THEMES[theme],
    /** Force a specific theme (overrides time detection until next interval tick) */
    setTheme: (t: SolarisTheme) => {
      setTheme(t)
      applyTokens(t)
    },
  }
}

export { THEMES }
