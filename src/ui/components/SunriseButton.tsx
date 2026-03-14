"use client"

import { useState, useCallback, useRef, useEffect } from "react"

/**
 * SunriseButton — Solaris brand ticket button.
 *
 * Concept: Minimalist sun rising over a horizon line.
 * Palette: #FF3300 (solar orange) · #4141C6 (deep blue) · #FFF · #000
 * Typography: Space Mono (via --font-space-mono CSS variable from layout.tsx)
 * States: idle → hover (sun rises) → active (radiant burst → opens URL)
 * A11y: button role, descriptive aria-label, prefers-reduced-motion safe.
 */

export type SunriseButtonProps = {
  artistName: string
  href: string
  colorIndex?: number
  /** When provided, click triggers onSelect instead of opening href directly. */
  onSelect?: () => void
}

/* ── Brand palette ── */
const SOLAR  = "#FF3300"
const SOLAR_GLOW = "#FF5C33"
const DEEP   = "#4141C6"
const DEEP_L = "#5C5CD6"

/**
 * Two brand-derived schemes: solar (orange-dominant) and oceanic (blue-dominant).
 * colorIndex alternates so adjacent cards never share the same scheme.
 */
const SCHEMES = [
  { sun: SOLAR, glow: SOLAR_GLOW, horizon: DEEP,   sea: DEEP_L,  label: "#fff" },
  { sun: DEEP,  glow: DEEP_L,    horizon: SOLAR,   sea: SOLAR_GLOW, label: "#fff" },
]

function splitName(name: string): string[] {
  const upper = name.toUpperCase()
  const words = upper.split(/\s+/)
  if (words.length === 1 && upper.length > 10) {
    const mid = Math.ceil(upper.length / 2)
    return [upper.slice(0, mid), upper.slice(mid)]
  }
  if (words.length <= 2) return words
  return [
    words.slice(0, Math.ceil(words.length / 2)).join(" "),
    words.slice(Math.ceil(words.length / 2)).join(" "),
  ]
}

function calcFontSize(lines: string[]): number {
  const longest = Math.max(...lines.map((l) => l.length))
  if (longest <= 5) return 12
  if (longest <= 8) return 10
  if (longest <= 12) return 8.5
  return 7
}

const FONT = "var(--font-space-mono, 'Space Mono', monospace)"

export default function SunriseButton({
  artistName,
  href,
  colorIndex = 0,
  onSelect,
}: SunriseButtonProps) {
  const scheme = SCHEMES[colorIndex % SCHEMES.length] ?? SCHEMES[0]!
  const lines = splitName(artistName)
  const fSize = calcFontSize(lines)
  const uid = `sb-${artistName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`

  const [burst, setBurst] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (burst) return
      setBurst(true)
      timer.current = setTimeout(() => {
        if (onSelect) {
          onSelect()
        } else {
          window.open(href, "_blank", "noopener,noreferrer")
        }
      }, 650)
    },
    [href, burst, onSelect],
  )

  /* ── Responsive: 170px base, scales down on mobile ── */
  const SIZE = 170
  const CX = SIZE / 2        // 85
  const HORIZON_Y = 102
  const SUN_CY = 70
  const SUN_R = 32

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Comprar entradas — ${artistName}`}
      className="inline-block relative cursor-pointer bg-transparent border-none p-0"
      style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}
    >
      <style>{`
        /* ── Idle: gentle sun breathing ── */
        @keyframes ${uid}-breathe {
          0%, 100% { opacity: 0.18; }
          50%      { opacity: 0.35; }
        }
        .${uid}-glow {
          animation: ${uid}-breathe 4s ease-in-out infinite;
        }

        /* ── Hover: sun rises above horizon ── */
        .${uid}-sun {
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        button:hover .${uid}-sun {
          transform: translateY(-6px);
        }
        button:hover .${uid}-glow {
          animation-duration: 2.2s;
        }

        /* ── Active: radiant burst ── */
        @keyframes ${uid}-burst {
          0%   { r: ${SUN_R}; opacity: 0.9; }
          100% { r: ${SUN_R * 2.8}; opacity: 0; }
        }
        .${uid}-burst {
          opacity: 0;
        }
        .${uid}-fired .${uid}-burst {
          animation: ${uid}-burst 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* ── Active: body fades ── */
        .${uid}-body {
          transition: opacity 0.25s ease 0.3s;
        }
        .${uid}-fired .${uid}-body {
          opacity: 0.15;
        }

        /* ── Horizon shimmer ── */
        @keyframes ${uid}-shimmer {
          0%, 100% { stroke-opacity: 0.6; }
          50%      { stroke-opacity: 1; }
        }
        .${uid}-horizon {
          animation: ${uid}-shimmer 3s ease-in-out infinite;
        }

        /* ── ENTRADAS pulse below horizon ── */
        @keyframes ${uid}-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.9; }
        }
        .${uid}-entradas {
          animation: ${uid}-pulse 2.5s ease-in-out infinite;
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .${uid}-glow,
          .${uid}-horizon,
          .${uid}-entradas { animation: none; }
          .${uid}-sun { transition: none; }
        }
      `}</style>

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
        className={burst ? `${uid}-fired` : ""}
        role="img"
        aria-hidden="true"
      >
        <defs>
          {/* Sun gradient */}
          <radialGradient id={`${uid}-sg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={scheme.sun} />
            <stop offset="100%" stopColor={scheme.glow} />
          </radialGradient>

          {/* Glow gradient */}
          <radialGradient id={`${uid}-gg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={scheme.glow} stopOpacity="0.5" />
            <stop offset="100%" stopColor={scheme.glow} stopOpacity="0" />
          </radialGradient>

          {/* Sea gradient below horizon */}
          <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scheme.horizon} stopOpacity="0.06" />
            <stop offset="100%" stopColor={scheme.sea} stopOpacity="0.02" />
          </linearGradient>

          {/* Clip: only below horizon */}
          <clipPath id={`${uid}-below`}>
            <rect x="0" y={HORIZON_Y} width={SIZE} height={SIZE - HORIZON_Y} />
          </clipPath>
        </defs>

        {/* ── Card background ── */}
        <rect
          x="0" y="0" width={SIZE} height={SIZE}
          rx="10"
          fill="#fff"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />

        <g className={`${uid}-body`}>
          {/* ── Sea zone below horizon ── */}
          <rect
            x="0" y={HORIZON_Y} width={SIZE} height={SIZE - HORIZON_Y}
            rx="0"
            fill={`url(#${uid}-sea)`}
          />

          {/* ── Sea reflection ── */}
          <g clipPath={`url(#${uid}-below)`} opacity="0.08">
            <ellipse cx={CX} cy={HORIZON_Y} rx={42} ry={18} fill={scheme.glow} />
          </g>

          {/* ── Horizon line ── */}
          <line
            x1="16" y1={HORIZON_Y} x2={SIZE - 16} y2={HORIZON_Y}
            stroke={scheme.horizon}
            strokeWidth="1.5"
            strokeLinecap="round"
            className={`${uid}-horizon`}
          />

          {/* ── ENTRADAS below horizon ── */}
          <text
            x={CX} y={HORIZON_Y + 22}
            textAnchor="middle"
            fill={scheme.horizon}
            fontFamily={FONT}
            fontSize="7"
            fontWeight="700"
            letterSpacing="4.5"
            className={`${uid}-entradas`}
          >
            ENTRADAS
          </text>

          {/* ── SOLARIS NERJA micro-label ── */}
          <text
            x={CX} y={HORIZON_Y + 36}
            textAnchor="middle"
            fill="rgba(0,0,0,0.2)"
            fontFamily={FONT}
            fontSize="4.5"
            letterSpacing="3"
          >
            SOLARIS NERJA
          </text>
        </g>

        {/* ── Sun group (rises on hover) ── */}
        <g className={`${uid}-sun`}>
          {/* Breathing glow halo */}
          <circle
            cx={CX} cy={SUN_CY} r={SUN_R + 22}
            fill={`url(#${uid}-gg)`}
            className={`${uid}-glow`}
          />

          {/* Sun disc */}
          <circle
            cx={CX} cy={SUN_CY} r={SUN_R}
            fill={`url(#${uid}-sg)`}
          />

          {/* Inner ring */}
          <circle
            cx={CX} cy={SUN_CY} r={SUN_R - 2}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
          />

          {/* Artist name */}
          {lines.map((line, i) => {
            const totalH = lines.length * (fSize + 2)
            const y = SUN_CY - totalH / 2 + fSize / 2 + i * (fSize + 2)
            return (
              <text
                key={i}
                x={CX}
                y={y}
                textAnchor="middle"
                fill={scheme.label}
                fontFamily={FONT}
                fontSize={fSize}
                fontWeight="700"
                letterSpacing="0.5"
              >
                {line}
              </text>
            )
          })}
        </g>

        {/* ── Burst ring (click only) ── */}
        <circle
          cx={CX} cy={SUN_CY} r={SUN_R}
          fill="none"
          stroke={scheme.sun}
          strokeWidth="2"
          className={`${uid}-burst`}
        />
      </svg>
    </button>
  )
}
