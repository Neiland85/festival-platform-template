import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, THRESHOLDS, LOAD_STAGES, defaultHeaders } from "./config.js"

/**
 * Health & readiness probe load test
 *
 * Validates /api/healthz and /api/readyz stay responsive under load.
 * These endpoints are used by uptime monitors and Kubernetes probes.
 *
 * Run:
 *   k6 run k6/api-health.js
 */

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    // Health checks must be fast
    "http_req_duration{endpoint:healthz}": ["p(95)<100"],
    "http_req_duration{endpoint:readyz}": ["p(95)<200"],
  },
  tags: { test: "api-health" },
}

export default function () {
  const headers = defaultHeaders()

  // Liveness probe
  const healthz = http.get(`${BASE_URL}/api/healthz`, {
    headers,
    tags: { endpoint: "healthz" },
  })

  check(healthz, {
    "healthz status 200": (r) => r.status === 200,
    "healthz returns ok": (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === "ok"
      } catch {
        return false
      }
    },
  })

  // Readiness probe (may check DB)
  const readyz = http.get(`${BASE_URL}/api/readyz`, {
    headers,
    tags: { endpoint: "readyz" },
  })

  check(readyz, {
    "readyz status 200": (r) => r.status === 200,
    "readyz returns ready": (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === "ok" || body.status === "ready"
      } catch {
        return false
      }
    },
  })

  sleep(0.5)
}
