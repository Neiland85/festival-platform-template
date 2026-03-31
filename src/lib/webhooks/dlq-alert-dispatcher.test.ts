import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { dispatchAlerts, type FetchFn } from "./dlq-alert-dispatcher"
import { buildDeliveryBatch } from "./dlq-alert-delivery"
import type { DlqAlert } from "./dlq-alert-engine"

// ── Helpers ─────────────────────────────────────────────

function makeAlert(overrides: Partial<DlqAlert> = {}): DlqAlert {
  return {
    severity: "P1",
    eventType: "checkout.session.completed",
    error: "connection refused",
    count: 5,
    correlationIds: ["evt_aaa", "evt_bbb", "evt_ccc"],
    action: "retry",
    reason: "Transient failure",
    dashboardUrl: "/dashboard/dead-letters",
    ...overrides,
  }
}

function okResponse(): Response {
  return new Response("ok", { status: 200 })
}

function errorResponse(status: number): Response {
  return new Response("error", { status })
}

const CONFIG = {
  slackWebhookUrl: "https://hooks.slack.com/test",
  pagerdutyEventsUrl: "https://events.pagerduty.com/test",
}

/**
 * Wraps dispatchAlerts with automatic timer advancement.
 *
 * dispatchAlerts uses sleep() (setTimeout-based) for retry backoff.
 * With vi.useFakeTimers(), those sleeps never resolve unless we advance.
 * This helper runs the dispatch and continuously flushes pending timers
 * so the entire retry chain completes instantly.
 */
async function dispatchWithFakeTimers(
  ...args: Parameters<typeof dispatchAlerts>
): Promise<Awaited<ReturnType<typeof dispatchAlerts>>> {
  const promise = dispatchAlerts(...args)

  // Flush all pending timers in a loop until the dispatch promise settles.
  // Each runAllTimersAsync() resolves one round of pending setTimeout calls
  // (backoff sleeps + AbortController timeouts).
  let settled = false
  promise.then(() => { settled = true }, () => { settled = true })

  while (!settled) {
    await vi.runAllTimersAsync()
  }

  return promise
}

// ── Tests ───────────────────────────────────────────────

describe("dispatchAlerts", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── Routing ─────────────────────────────────────────

  it("sends P1 alert to both Slack and PagerDuty", { timeout: 20_000 }, async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(okResponse())
    const batch = buildDeliveryBatch([makeAlert({ severity: "P1" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.sent).toBe(1)
    expect(result.pagerduty.sent).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("sends P2 alert to Slack only (no PagerDuty)", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(okResponse())
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.sent).toBe(1)
    expect(result.pagerduty.sent).toBe(0)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const calledUrl = mockFetch.mock.calls[0]![0]
    expect(calledUrl).toBe(CONFIG.slackWebhookUrl)
  })

  it("skips Slack when no webhook URL configured", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(okResponse())
    const batch = buildDeliveryBatch([makeAlert({ severity: "P1" })])

    const result = await dispatchWithFakeTimers(
      batch,
      { pagerdutyEventsUrl: CONFIG.pagerdutyEventsUrl },
      mockFetch,
    )

    expect(result.slack.sent).toBe(0)
    expect(result.slack.failed).toBe(0)
    expect(result.pagerduty.sent).toBe(1)
  })

  // ── Retry on 5xx ────────────────────────────────────

  it("retries on 500 then 502, succeeds on third attempt", async () => {
    const mockFetch = vi.fn<FetchFn>()
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(502))
      .mockResolvedValueOnce(okResponse())

    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.sent).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it("retries on 503 and fails after all attempts exhausted", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(errorResponse(503))
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.failed).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.errors[0]!.error).toContain("3 attempts failed")
  })

  // ── Retry on 429 ───────────────────────────────────

  it("retries on 429 rate limit", async () => {
    const mockFetch = vi.fn<FetchFn>()
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(okResponse())

    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.sent).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  // ── No retry on 4xx ─────────────────────────────────

  it("does NOT retry on 400", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(errorResponse(400))
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.failed).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.errors[0]!.error).toContain("400")
  })

  it("does NOT retry on 401", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(errorResponse(401))
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.errors[0]!.error).toContain("401")
  })

  it("does NOT retry on 403", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(errorResponse(403))
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("does NOT retry on 422", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(errorResponse(422))
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ── AbortController timeout ─────────────────────────

  it("aborts fetch that hangs beyond timeout and retries", async () => {
    // Mock fetch that never resolves — simulates a hung connection.
    // The AbortController timeout (5000ms) fires and rejects the fetch.
    const mockFetch = vi.fn<FetchFn>().mockImplementation((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        // Listen for abort signal — this is how real fetch behaves
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"))
        })
      })
    })

    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    // All 3 attempts should have been made (each timed out)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.slack.failed).toBe(1)
    expect(result.errors[0]!.error).toContain("3 attempts failed")
  })

  // ── Network errors ──────────────────────────────────

  it("handles network errors gracefully", async () => {
    const mockFetch = vi.fn<FetchFn>().mockRejectedValue(new Error("ECONNREFUSED"))
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.failed).toBe(1)
    expect(result.errors[0]!.error).toContain("3 attempts failed")
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  // ── Resilience ──────────────────────────────────────

  it("never throws — even if everything fails", async () => {
    const mockFetch = vi.fn<FetchFn>().mockRejectedValue(new Error("total failure"))
    const batch = buildDeliveryBatch([
      makeAlert({ severity: "P1" }),
      makeAlert({ severity: "P2", eventType: "checkout.session.expired" }),
    ])

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.failed).toBe(2)
    expect(result.pagerduty.failed).toBe(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  // ── Deduplication ───────────────────────────────────

  it("deduplicates Slack sends within same run", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(okResponse())
    const alert = makeAlert({ severity: "P2" })
    const batch = buildDeliveryBatch([alert])
    batch.slack.push(batch.slack[0]!)

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.sent).toBe(1)
  })

  // ── Empty input ─────────────────────────────────────

  it("returns empty result for empty batch", async () => {
    const mockFetch = vi.fn<FetchFn>()
    const batch = { slack: [], pagerduty: [], plaintext: [] }

    const result = await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    expect(result.slack.sent).toBe(0)
    expect(result.pagerduty.sent).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // ── Payload correctness ─────────────────────────────

  it("sends correct JSON body to Slack", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(okResponse())
    const batch = buildDeliveryBatch([makeAlert({ severity: "P2" })])

    await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    const [, init] = mockFetch.mock.calls[0]!
    const body = JSON.parse(init.body as string)
    expect(body.channel).toBe("#ops-alerts")
    expect(body.blocks).toBeDefined()
    expect(Array.isArray(body.blocks)).toBe(true)
  })

  it("sends correct JSON body to PagerDuty", async () => {
    const mockFetch = vi.fn<FetchFn>().mockResolvedValue(okResponse())
    const batch = buildDeliveryBatch([makeAlert({ severity: "P1" })])

    await dispatchWithFakeTimers(batch, CONFIG, mockFetch)

    const pdCall = mockFetch.mock.calls.find(([url]) => url === CONFIG.pagerdutyEventsUrl)
    expect(pdCall).toBeDefined()

    const body = JSON.parse(pdCall![1].body as string)
    expect(body.event_action).toBe("trigger")
    expect(body.dedup_key).toBeDefined()
    expect(body.payload.severity).toBe("critical")
  })
})
