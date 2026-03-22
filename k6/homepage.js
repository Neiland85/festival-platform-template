import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, THINK_TIME_MS, resolveProfile, defaultHeaders } from "./config.js"

/**
 * Homepage load test
 *
 * Simulates real users landing on the homepage.
 * Uses dynamic profile via K6_PROFILE env (smoke|load|stress).
 *
 * Run:
 *   K6_PROFILE=smoke  k6 run k6/homepage.js
 *   K6_PROFILE=load   k6 run -e BASE_URL=https://staging.example.com k6/homepage.js
 *   K6_PROFILE=stress k6 run k6/homepage.js
 */

const { stages, thresholds } = resolveProfile()

export const options = {
  stages,
  thresholds,
  tags: { test: "homepage" },
}

export default function () {
  // GET /es (Spanish variant — primary locale)
  const resEs = http.get(`${BASE_URL}/es`, {
    headers: { ...defaultHeaders(), "Accept-Language": "es" },
    tags: { endpoint: "homepage_es" },
  })

  check(resEs, {
    "homepage ES status 200": (r) => r.status === 200,
    "homepage ES has content": (r) => r.body && r.body.length > 1000,
    "homepage ES p95 < threshold": (r) => r.timings.duration < 500,
  })

  // GET /en (English variant)
  const resEn = http.get(`${BASE_URL}/en`, {
    headers: { ...defaultHeaders(), "Accept-Language": "en" },
    tags: { endpoint: "homepage_en" },
  })

  check(resEn, {
    "homepage EN status 200": (r) => r.status === 200,
    "homepage EN has content": (r) => r.body && r.body.length > 1000,
  })

  // Simulate user reading time (jitter ±50%)
  const jitter = THINK_TIME_MS * (0.5 + Math.random())
  sleep(jitter / 1000)
}
