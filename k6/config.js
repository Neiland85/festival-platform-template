/**
 * k6 shared configuration — profiles & environment
 *
 * Usage (dynamic profile via K6_PROFILE env):
 *   K6_PROFILE=smoke  k6 run k6/homepage.js
 *   K6_PROFILE=load   k6 run k6/homepage.js
 *   K6_PROFILE=stress k6 run k6/homepage.js
 *
 * Import helpers:
 *   import { BASE_URL, resolveProfile, defaultHeaders } from "./config.js"
 *
 * Override BASE_URL at runtime:
 *   k6 run -e BASE_URL=https://staging.example.com k6/homepage.js
 *
 * Environment variables:
 *   BASE_URL        Target origin        (default: http://localhost:3000)
 *   K6_PROFILE      smoke | load | stress (default: smoke)
 *   THINK_TIME_MS   Pause between iters  (default: 1000)
 */

// ── Environment ────────────────────────────────────────────────
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"
export const THINK_TIME_MS = parseInt(__ENV.THINK_TIME_MS || "1000", 10)

// ── Common headers ─────────────────────────────────────────────
export function defaultHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "k6-load-test/1.0",
  }
}

// ── Thresholds per profile ─────────────────────────────────────

/**
 * Default thresholds — used as baseline SLO for smoke/load.
 *   p(95) < 500ms, p(99) < 1500ms, errors < 1%
 */
export const THRESHOLDS = {
  http_req_duration: ["p(95)<500", "p(99)<1500"],
  http_req_failed: ["rate<0.01"],
}

// ── Stage profiles ─────────────────────────────────────────────

/** Smoke — quick sanity. ~1 min, 5 VUs. */
export const SMOKE_STAGES = [
  { duration: "10s", target: 5 },
  { duration: "30s", target: 5 },
  { duration: "10s", target: 0 },
]

/** Load — sustained traffic. ~5 min, peak 100 VUs. */
export const LOAD_STAGES = [
  { duration: "30s", target: 20 },
  { duration: "1m", target: 50 },
  { duration: "2m", target: 100 },
  { duration: "1m", target: 50 },
  { duration: "30s", target: 0 },
]

/** Stress — find breaking point. ~8 min, peak 500 VUs. */
export const STRESS_STAGES = [
  { duration: "30s", target: 50 },
  { duration: "1m", target: 200 },
  { duration: "2m", target: 500 },
  { duration: "2m", target: 500 },
  { duration: "1m", target: 100 },
  { duration: "30s", target: 0 },
]

// ── Profile resolver ───────────────────────────────────────────
const PROFILES = {
  smoke: {
    stages: SMOKE_STAGES,
    thresholds: THRESHOLDS,
  },
  load: {
    stages: LOAD_STAGES,
    thresholds: {
      ...THRESHOLDS,
      http_reqs: ["rate>10"],
    },
  },
  stress: {
    stages: STRESS_STAGES,
    thresholds: {
      http_req_duration: ["p(95)<2000"],
      http_req_failed: ["rate<0.05"],
    },
  },
}

/**
 * Resolve profile from K6_PROFILE env var.
 * Returns { stages, thresholds } ready for `export const options`.
 *
 * Usage in test scripts:
 *   const { stages, thresholds } = resolveProfile()
 *   export const options = { stages, thresholds, tags: { test: "mytest" } }
 */
export function resolveProfile() {
  const name = (__ENV.K6_PROFILE || "smoke").toLowerCase()
  const profile = PROFILES[name]
  if (!profile) {
    throw new Error(
      `Unknown K6_PROFILE "${name}". Valid: ${Object.keys(PROFILES).join(", ")}`,
    )
  }
  return { ...profile, profileName: name }
}
