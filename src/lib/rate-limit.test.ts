import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  rateLimit as rateLimitLocal,
  _resetStore,
  _getStoreSize,
  _getCleanupEvery,
} from "./rateLimitLocal"

/**
 * These tests exercise the in-memory sliding window rate limiter directly.
 * The unified async wrapper in rate-limit.ts delegates to this module
 * when UPSTASH_REDIS_REST_URL is not configured.
 */
describe("rateLimitLocal", () => {
  beforeEach(() => {
    _resetStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("allows requests until limit is reached", () => {
    const ip = "1.2.3.4"
    for (let i = 0; i < 20; i++) {
      expect(rateLimitLocal(ip).allowed).toBe(true)
    }
    const blocked = rateLimitLocal(ip)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it("returns remaining count correctly", () => {
    const ip = "1.2.3.4"
    const first = rateLimitLocal(ip)
    expect(first.remaining).toBe(19)
    expect(first.limit).toBe(20)
    expect(first.current).toBe(1)

    for (let i = 1; i < 20; i++) {
      rateLimitLocal(ip)
    }
    const last = rateLimitLocal(ip)
    expect(last.remaining).toBe(0)
    expect(last.current).toBe(20)
  })

  it("tracks IPs independently", () => {
    const ipA = "10.0.0.1"
    const ipB = "10.0.0.2"

    for (let i = 0; i < 20; i++) {
      rateLimitLocal(ipA)
    }

    expect(rateLimitLocal(ipA).allowed).toBe(false)
    expect(rateLimitLocal(ipB).allowed).toBe(true)
  })

  it("respects custom window and limit params", () => {
    const ip = "1.2.3.4"
    const windowMs = 5000
    const maxRequests = 3

    for (let i = 0; i < 3; i++) {
      expect(rateLimitLocal(ip, windowMs, maxRequests).allowed).toBe(true)
    }
    expect(rateLimitLocal(ip, windowMs, maxRequests).allowed).toBe(false)

    // Advance past window
    vi.advanceTimersByTime(5001)
    expect(rateLimitLocal(ip, windowMs, maxRequests).allowed).toBe(true)
  })

  describe("window expiration", () => {
    it("resets counter after 60-second window expires", () => {
      const ip = "192.168.1.1"

      // Fill up to the limit
      for (let i = 0; i < 20; i++) {
        expect(rateLimitLocal(ip).allowed).toBe(true)
      }

      // Next request is blocked
      expect(rateLimitLocal(ip).allowed).toBe(false)

      // Advance time by 59 seconds - still blocked
      vi.advanceTimersByTime(59 * 1000)
      expect(rateLimitLocal(ip).allowed).toBe(false)

      // Advance more than 1 second to ensure > 60000ms has passed
      vi.advanceTimersByTime(1500)

      // Now new requests are allowed
      expect(rateLimitLocal(ip).allowed).toBe(true)
      for (let i = 1; i < 20; i++) {
        expect(rateLimitLocal(ip).allowed).toBe(true)
      }
      expect(rateLimitLocal(ip).allowed).toBe(false)
    })

    it("sliding window allows gradual recovery", () => {
      const ip = "192.168.1.1"
      const windowMs = 10_000
      const maxRequests = 5

      // Send 5 requests at t=0 (window full)
      for (let i = 0; i < 5; i++) {
        rateLimitLocal(ip, windowMs, maxRequests)
      }
      expect(rateLimitLocal(ip, windowMs, maxRequests).allowed).toBe(false)

      // At t=10001 the first request expires → 1 slot opens
      vi.advanceTimersByTime(10_001)
      const result = rateLimitLocal(ip, windowMs, maxRequests)
      expect(result.allowed).toBe(true)
      // All 5 old ones expired, so remaining = maxRequests - 1
      expect(result.remaining).toBe(4)
    })

    it("allows new IPs within the same window", () => {
      const ip = "192.168.1.1"

      for (let i = 0; i < 20; i++) {
        rateLimitLocal(ip)
      }

      vi.advanceTimersByTime(30 * 1000)
      expect(rateLimitLocal("192.168.1.2").allowed).toBe(true)
      expect(rateLimitLocal(ip).allowed).toBe(false)
    })

    it("prunes expired entries on access using sampled cleanup", () => {
      const ipA = "192.168.1.1"
      const ipB = "192.168.1.2"
      let calls = 0

      const countedCall = (ip: string) => {
        calls++
        rateLimitLocal(ip)
      }

      countedCall(ipA)
      countedCall(ipB)

      // Move past the window so ipB is expired
      vi.advanceTimersByTime(61 * 1000)
      countedCall(ipA)

      const cleanupEvery = _getCleanupEvery()
      const remainder = calls % cleanupEvery
      const remaining = remainder === 0 ? cleanupEvery : cleanupEvery - remainder
      const callsBeforeCleanup = remaining - 1

      for (let i = 0; i < callsBeforeCleanup; i++) {
        countedCall(ipA)
      }

      expect(_getStoreSize()).toBe(2)

      // Next call triggers cleanup → removes expired ipB
      countedCall(ipA)
      expect(_getStoreSize()).toBe(1)
    })
  })

  describe("MAX_STORE_SIZE safety valve", () => {
    it("evicts oldest entry when store reaches 10,000 entries", () => {
      for (let i = 0; i < 10000; i++) {
        rateLimitLocal(`192.168.1.${i}`)
      }

      const newIp = "10.0.0.1"
      expect(rateLimitLocal(newIp).allowed).toBe(true)

      for (let i = 1; i < 20; i++) {
        expect(rateLimitLocal(newIp).allowed).toBe(true)
      }
      expect(rateLimitLocal(newIp).allowed).toBe(false)
    })

    it("handles rapid evictions under high load", () => {
      const ips: string[] = []
      for (let i = 0; i < 500; i++) {
        ips.push(`192.168.1.${i}`)
      }

      for (let batch = 0; batch < 22; batch++) {
        for (const ip of ips) {
          rateLimitLocal(ip)
        }
      }

      const crashTestIp = "10.0.0.1"
      expect(rateLimitLocal(crashTestIp).allowed).toBe(true)
    })
  })

  describe("concurrent requests", () => {
    it("increments counter correctly for sequential requests from same IP", () => {
      const ip = "172.16.0.1"

      const results: boolean[] = []
      for (let i = 0; i < 5; i++) {
        results.push(rateLimitLocal(ip).allowed)
      }

      expect(results).toEqual([true, true, true, true, true])

      for (let i = 0; i < 15; i++) {
        expect(rateLimitLocal(ip).allowed).toBe(true)
      }
      expect(rateLimitLocal(ip).allowed).toBe(false)
    })

    it("maintains accurate count with interleaved IPs", () => {
      const ipA = "172.16.0.1"
      const ipB = "172.16.0.2"
      const ipC = "172.16.0.3"

      for (let i = 0; i < 10; i++) {
        expect(rateLimitLocal(ipA).allowed).toBe(true)
        expect(rateLimitLocal(ipB).allowed).toBe(true)
        expect(rateLimitLocal(ipC).allowed).toBe(true)
      }

      for (let i = 10; i < 20; i++) {
        expect(rateLimitLocal(ipA).allowed).toBe(true)
        expect(rateLimitLocal(ipB).allowed).toBe(true)
      }

      expect(rateLimitLocal(ipA).allowed).toBe(false)
      expect(rateLimitLocal(ipB).allowed).toBe(false)

      for (let i = 10; i < 20; i++) {
        expect(rateLimitLocal(ipC).allowed).toBe(true)
      }
      expect(rateLimitLocal(ipC).allowed).toBe(false)
    })
  })
})

describe("rateLimit (unified facade)", () => {
  beforeEach(() => {
    _resetStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("falls back to local when UPSTASH_REDIS_REST_URL is not set", async () => {
    const { rateLimit } = await import("./rate-limit")

    const ip = "10.0.0.1"
    const result = await rateLimit(ip)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(19)
  })

  it("rateLimitSync always uses local store", async () => {
    const { rateLimitSync } = await import("./rate-limit")

    const ip = "10.0.0.1"
    for (let i = 0; i < 20; i++) {
      expect(rateLimitSync(ip).allowed).toBe(true)
    }
    expect(rateLimitSync(ip).allowed).toBe(false)
  })

  it("setRateLimitHeaders sets correct headers", async () => {
    const { setRateLimitHeaders } = await import("./rate-limit")

    const headers = new Headers()
    setRateLimitHeaders(headers, {
      allowed: false,
      remaining: 0,
      retryAfterMs: 45_000,
      current: 20,
      limit: 20,
    })

    expect(headers.get("X-RateLimit-Limit")).toBe("20")
    expect(headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(headers.get("Retry-After")).toBe("45")
  })
})
