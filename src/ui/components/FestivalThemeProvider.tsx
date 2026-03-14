"use client"

import { useFestivalTheme } from "@/ui/hooks/useFestivalTheme"

/**
 * FestivalThemeProvider — Headless client component that activates
 * the Golden Hour theme system.
 *
 * Place once inside <body> in layout.tsx. Renders nothing visible.
 * The hook injects CSS variables directly on <html> so the entire
 * cascade (including server components) picks up the theme tokens.
 */
export default function FestivalThemeProvider() {
  useFestivalTheme()
  return null
}
