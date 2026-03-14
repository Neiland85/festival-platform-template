import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, THRESHOLDS, defaultHeaders } from "./config.js"

/**
 * Concurrent users stress test
 *
 * Ramps from 100 → 500 → 1000 VUs to find breaking points.
 * Mixes homepage loads, API calls, and form submissions
 * to simulate a realistic traffic spike (e.g., ticket drop announcement).
 *
 * Run:
 *   k6 run k6/concurrent-users.js
 *
 * For a lighter smoke test:
 *   k6 run -e PROFILE=smoke k6/concurrent-users.js
 */

const PROFILE = __ENV.PROFILE || "stress"

const STAGES = {
  smoke: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "10s", target: 0 },
  ],
  load: [
    { duration: "30s", target: 50 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  stress: [
    { duration: "30s", target: 100 },
    { duration: "1m", target: 300 },
    { duration: "2m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "2m", target: 1000 },
    { duration: "1m", target: 500 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
}

export const options = {
  stages: STAGES[PROFILE] || STAGES.stress,
  thresholds: {
    ...THRESHOLDS,
    // Relax thresholds slightly for stress test
    http_req_duration: ["p(95)<800", "p(99)<3000"],
    http_req_failed: ["rate<0.05"], // Allow up to 5% errors under extreme load
  },
  tags: { test: "concurrent-users", profile: PROFILE },
}

/**
 * Traffic mix weights (must sum to 100):
 *   60% — Browse homepage (most common action)
 *   20% — Check event listings via API
 *   10% — Health check (monitoring bots)
 *   10% — Lead submission (conversion funnel)
 */
export default function () {
  const headers = defaultHeaders()
  const roll = Math.random() * 100

  if (roll < 60) {
    // ── Browse homepage ───────────────────────────
    const locale = Math.random() < 0.7 ? "es" : "en"
    const res = http.get(`${BASE_URL}/${locale}`, {
      headers: { ...headers, "Accept-Language": locale },
      tags: { endpoint: "homepage" },
    })
    check(res, {
      "homepage loads": (r) => r.status === 200,
    })
    sleep(Math.random() * 3 + 1)
  } else if (roll < 80) {
    // ── Events API ────────────────────────────────
    const res = http.get(`${BASE_URL}/api/v1/events`, {
      headers,
      tags: { endpoint: "events-api" },
    })
    check(res, {
      "events API status 200": (r) => r.status === 200,
      "events API returns array": (r) => {
        try {
          return Array.isArray(JSON.parse(r.body))
        } catch {
          return false
        }
      },
    })
    sleep(Math.random() * 2 + 0.5)
  } else if (roll < 90) {
    // ── Health check ──────────────────────────────
    const res = http.get(`${BASE_URL}/api/healthz`, {
      headers,
      tags: { endpoint: "healthz" },
    })
    check(res, {
      "healthz ok": (r) => r.status === 200,
    })
    sleep(0.5)
  } else {
    // ── Lead submission ───────────────────────────
    const payload = JSON.stringify({
      name: "Stress Test",
      surname: `User-${__VU}`,
      email: `stress-${__VU}-${__ITER}-${Date.now()}@loadtest.example`,
      phone: "+34600000000",
      consentGiven: true,
      source: "k6-stress-test",
    })

    const res = http.post(`${BASE_URL}/api/v1/leads`, payload, {
      headers,
      tags: { endpoint: "leads" },
    })
    check(res, {
      "lead submitted or rate-limited": (r) =>
        r.status === 200 || r.status === 201 || r.status === 429,
    })
    sleep(Math.random() * 4 + 2)
  }
}
