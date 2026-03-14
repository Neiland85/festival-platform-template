import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, THRESHOLDS, LOAD_STAGES, defaultHeaders } from "./config.js"

/**
 * Homepage load test
 *
 * Simulates real users landing on the homepage.
 * Validates that the page loads within SLO thresholds.
 *
 * Run:
 *   k6 run k6/homepage.js
 *   k6 run -e BASE_URL=https://staging.example.com k6/homepage.js
 */

export const options = {
  stages: LOAD_STAGES,
  thresholds: THRESHOLDS,
  tags: { test: "homepage" },
}

export default function () {
  // GET / (redirects to /es or /en based on Accept-Language)
  const resEs = http.get(`${BASE_URL}/es`, {
    headers: { ...defaultHeaders(), "Accept-Language": "es" },
    tags: { endpoint: "homepage_es" },
  })

  check(resEs, {
    "homepage ES status 200": (r) => r.status === 200,
    "homepage ES has content": (r) => r.body && r.body.length > 1000,
  })

  // English variant
  const resEn = http.get(`${BASE_URL}/en`, {
    headers: { ...defaultHeaders(), "Accept-Language": "en" },
    tags: { endpoint: "homepage_en" },
  })

  check(resEn, {
    "homepage EN status 200": (r) => r.status === 200,
    "homepage EN has content": (r) => r.body && r.body.length > 1000,
  })

  // Simulate user reading the page
  sleep(Math.random() * 2 + 1) // 1-3 seconds
}
