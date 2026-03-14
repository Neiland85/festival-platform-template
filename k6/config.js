/**
 * k6 shared configuration
 *
 * Usage:
 *   import { BASE_URL, THRESHOLDS, defaultHeaders } from "./config.js"
 *
 * Override BASE_URL at runtime:
 *   k6 run -e BASE_URL=https://staging.example.com k6/homepage.js
 */

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

/**
 * Default thresholds — every script imports these so we enforce
 * consistent SLOs across all load tests.
 *
 *   p(95) < 500ms   — 95th percentile response time
 *   p(99) < 1500ms  — 99th percentile response time
 *   errors < 1%     — HTTP error rate (4xx/5xx)
 */
export const THRESHOLDS = {
  http_req_duration: ["p(95)<500", "p(99)<1500"],
  http_req_failed: ["rate<0.01"],
}

/** Common headers sent with every request. */
export function defaultHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "k6-load-test/1.0",
  }
}

/**
 * Smoke-test stage profile — quick sanity check.
 * ~1 minute, peaks at 5 VUs.
 */
export const SMOKE_STAGES = [
  { duration: "10s", target: 5 },
  { duration: "30s", target: 5 },
  { duration: "10s", target: 0 },
]

/**
 * Load-test stage profile — sustained traffic.
 * ~5 minutes, peaks at 100 VUs.
 */
export const LOAD_STAGES = [
  { duration: "30s", target: 20 },
  { duration: "1m", target: 50 },
  { duration: "2m", target: 100 },
  { duration: "1m", target: 50 },
  { duration: "30s", target: 0 },
]

/**
 * Stress-test stage profile — find breaking points.
 * ~8 minutes, ramps to 500 VUs.
 */
export const STRESS_STAGES = [
  { duration: "30s", target: 50 },
  { duration: "1m", target: 200 },
  { duration: "2m", target: 500 },
  { duration: "2m", target: 500 },
  { duration: "1m", target: 100 },
  { duration: "30s", target: 0 },
]
