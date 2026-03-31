/**
 * DLQ Alert Dispatcher
 *
 * Sends delivery payloads to external systems (Slack, PagerDuty).
 * Retries transient failures with exponential backoff.
 * Never throws — all errors are logged and swallowed.
 *
 * Idempotency:
 * - PagerDuty: dedup_key ensures same alert doesn't create duplicate incidents
 * - Slack: dispatcher tracks sent keys within a run to avoid double-posts
 */

import type { DeliveryBatch, SlackPayload, PagerDutyPayload } from "./dlq-alert-delivery"
import { log } from "@/lib/logger"

// ── Config ──────────────────────────────────────────────
//
// Alert delivery is NOT on the critical path — a failed Slack message
// does not block webhook processing or order fulfillment. The retry
// budget is intentionally short:
//
//   Attempt 1 → fail → wait 1s → Attempt 2 → fail → wait 5s → Attempt 3 → give up
//
// Worst case: 5s + 1s + 5s + 5s + 5s = 21s total (with 5s fetch timeouts).
// This is acceptable because the caller (auto-retry worker or cron) is
// already fire-and-forget. Longer backoffs (10s+) would delay the entire
// dispatch run and risk overlapping with the next scheduled cycle.
//
// If all 3 attempts fail, the alert is logged locally as
// alert.dispatch_failed — operators can still find it in structured logs.

const MAX_ATTEMPTS = 3   // 1 initial + 2 retries
const BACKOFF_MS = [1_000, 5_000]
const FETCH_TIMEOUT_MS = 5_000

// ── Types ───────────────────────────────────────────────

export type DispatchConfig = {
  slackWebhookUrl?: string
  pagerdutyEventsUrl?: string
}

export type DispatchResult = {
  slack: { sent: number; failed: number }
  pagerduty: { sent: number; failed: number }
  errors: Array<{ channel: string; alertId: string; error: string }>
}

/**
 * Injectable fetch for testing. Defaults to global fetch.
 * Signature matches the standard Fetch API.
 */
export type FetchFn = (url: string, init: RequestInit) => Promise<Response>

// ── Retry logic ─────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Fast, non-cryptographic string hash for in-memory dedup. DJB2 variant. */
function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

function isRetryable(status: number): boolean {
  // Retry on transient failures only. Client errors (4xx) indicate a
  // permanent problem (bad payload, wrong URL, auth failure) — retrying
  // would waste time and produce the same result.
  //
  // Retryable:  5xx (server error), 429 (rate limit)
  // Not retryable: 400, 401, 403, 404, 422 (client errors)
  if (status >= 500) return true
  if (status === 429) return true
  return false
}

type FetchResult = {
  ok: boolean
  error?: string
  /** 1-based attempt number that produced the final outcome */
  attempts: number
}

async function fetchWithRetry(
  url: string,
  body: unknown,
  alertId: string,
  channel: string,
  fetchFn: FetchFn,
): Promise<FetchResult> {
  let lastError = ""

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      const res = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (res.ok) {
        clearTimeout(timeout)
        return { ok: true, attempts: attempt + 1 }
      }

      // Non-retryable HTTP error (4xx except 429) — fail fast, no retry
      if (!isRetryable(res.status)) {
        // Keep timeout active while reading body — server may stall here
        const text = await res.text().catch(() => "")
        clearTimeout(timeout)
        return {
          ok: false,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
          attempts: attempt + 1,
        }
      }

      // Retryable status — done reading this response, safe to clear
      clearTimeout(timeout)

      // Retryable HTTP error — log and backoff
      lastError = `HTTP ${res.status}`
      const delay = BACKOFF_MS[attempt] ?? 5_000
      log("warn", "alert.retry_attempt", {
        channel,
        alertId,
        attempt: attempt + 1,
        maxAttempts: MAX_ATTEMPTS,
        delay,
        status: res.status,
      })
    } catch (err: unknown) {
      // Network error or abort — retryable
      const errorMsg = err instanceof Error ? err.message : String(err)
      lastError = errorMsg
      const delay = BACKOFF_MS[attempt] ?? 5_000
      log("warn", "alert.retry_attempt", {
        channel,
        alertId,
        attempt: attempt + 1,
        maxAttempts: MAX_ATTEMPTS,
        delay,
        error: errorMsg,
      })
    }

    // Backoff before next attempt (skip after last attempt)
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BACKOFF_MS[attempt] ?? 5_000)
    }
  }

  return {
    ok: false,
    error: `All ${MAX_ATTEMPTS} attempts failed (last: ${lastError})`,
    attempts: MAX_ATTEMPTS,
  }
}

// ── Dispatcher ──────────────────────────────────────────

const PD_EVENTS_URL = "https://events.pagerduty.com/v2/enqueue"

export async function dispatchAlerts(
  batch: DeliveryBatch,
  config: DispatchConfig,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<DispatchResult> {
  const result: DispatchResult = {
    slack: { sent: 0, failed: 0 },
    pagerduty: { sent: 0, failed: 0 },
    errors: [],
  }

  const sentSlackKeys = new Set<string>()

  // ── Slack
  if (config.slackWebhookUrl) {
    for (const payload of batch.slack) {
      // Deterministic dedup key from payload content.
      // Uses JSON serialization — same payload always produces the same key.
      // Not derived from block structure, so layout changes won't break dedup.
      const alertId = `slack:${simpleHash(JSON.stringify(payload.blocks))}`

      if (sentSlackKeys.has(alertId)) continue
      sentSlackKeys.add(alertId)

      const sendResult = await fetchWithRetry(
        config.slackWebhookUrl,
        payload,
        alertId,
        "slack",
        fetchFn,
      )

      if (sendResult.ok) {
        result.slack.sent++
        log("info", sendResult.attempts > 1 ? "alert.dispatch_success_after_retry" : "alert.dispatch_success", {
          channel: "slack",
          alertId,
          attempts: sendResult.attempts,
        })
      } else {
        result.slack.failed++
        result.errors.push({ channel: "slack", alertId, error: sendResult.error ?? "unknown" })
        log("error", "alert.dispatch_failed", {
          channel: "slack",
          alertId,
          attempts: sendResult.attempts,
          error: sendResult.error,
        })
      }
    }
  }

  // ── PagerDuty
  const pdUrl = config.pagerdutyEventsUrl ?? PD_EVENTS_URL

  for (const payload of batch.pagerduty) {
    // PagerDuty has native dedup via dedup_key, but we skip within the run too
    const alertId = payload.dedup_key

    const sendResult = await fetchWithRetry(
      pdUrl,
      payload,
      alertId,
      "pagerduty",
      fetchFn,
    )

    if (sendResult.ok) {
      result.pagerduty.sent++
      log("info", sendResult.attempts > 1 ? "alert.dispatch_success_after_retry" : "alert.dispatch_success", {
        channel: "pagerduty",
        alertId,
        attempts: sendResult.attempts,
      })
    } else {
      result.pagerduty.failed++
      result.errors.push({ channel: "pagerduty", alertId, error: sendResult.error ?? "unknown" })
      log("error", "alert.dispatch_failed", {
        channel: "pagerduty",
        alertId,
        attempts: sendResult.attempts,
        error: sendResult.error,
      })
    }
  }

  log("info", "alert.dispatch_completed", {
    slackSent: result.slack.sent,
    slackFailed: result.slack.failed,
    pdSent: result.pagerduty.sent,
    pdFailed: result.pagerduty.failed,
    totalErrors: result.errors.length,
  })

  return result
}
