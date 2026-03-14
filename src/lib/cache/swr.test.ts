/**
 * Tests para M4: Cache Layer — Stale-While-Revalidate
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { SWRCache, TTL } from "./swr"

describe("SWRCache", () => {
  let cache: SWRCache

  beforeEach(() => {
    cache = new SWRCache()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("get() — cache miss", () => {
    it("calls fetcher on first access", async () => {
      const fetcher = vi.fn().mockResolvedValue({ count: 42 })

      const result = await cache.get("test", fetcher, 30_000)

      expect(result).toEqual({ count: 42 })
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it("increments miss counter", async () => {
      await cache.get("test", async () => "data", 30_000)

      const stats = cache.getStats()
      expect(stats.misses).toBe(1)
      expect(stats.hits).toBe(0)
    })
  })

  describe("get() — FRESH cache hit", () => {
    it("returns cached value without calling fetcher", async () => {
      const fetcher = vi.fn().mockResolvedValue("fresh-data")

      // Prime cache
      await cache.get("key1", fetcher, 30_000)
      expect(fetcher).toHaveBeenCalledTimes(1)

      // Second access — should hit cache
      const result = await cache.get("key1", fetcher, 30_000)
      expect(result).toBe("fresh-data")
      expect(fetcher).toHaveBeenCalledTimes(1) // NOT called again
    })

    it("increments hit counter", async () => {
      await cache.get("key1", async () => "data", 30_000)
      await cache.get("key1", async () => "data", 30_000)
      await cache.get("key1", async () => "data", 30_000)

      const stats = cache.getStats()
      expect(stats.hits).toBe(2) // 1 miss + 2 hits
      expect(stats.misses).toBe(1)
    })
  })

  describe("get() — STALE (SWR behavior)", () => {
    it("returns stale value and triggers background revalidation", async () => {
      vi.useFakeTimers()

      let fetchCount = 0
      const fetcher = vi.fn().mockImplementation(async () => {
        fetchCount++
        return `data-v${fetchCount}`
      })

      // Prime cache with TTL=100ms
      await cache.get("swr-key", fetcher, 100)
      expect(fetcher).toHaveBeenCalledTimes(1)

      // Advance past TTL but within 2*TTL (stale zone)
      vi.advanceTimersByTime(150)

      // Should return stale value
      const result = await cache.get("swr-key", fetcher, 100)
      expect(result).toBe("data-v1") // stale value returned immediately

      // Allow revalidation promise to resolve
      await vi.runAllTimersAsync()

      const stats = cache.getStats()
      expect(stats.staleHits).toBe(1)
      expect(stats.revalidations).toBe(1)
    })

    it("does not trigger multiple revalidations concurrently", async () => {
      vi.useFakeTimers()

      // Use a deferred promise that we control
      let resolveRevalidation!: (v: string) => void
      let fetchCount = 0
      const fetcher = vi.fn().mockImplementation(() => {
        fetchCount++
        if (fetchCount === 1) return Promise.resolve("data-v1")
        // Second call (revalidation) — returns a pending promise
        return new Promise<string>((resolve) => {
          resolveRevalidation = resolve
        })
      })

      await cache.get("key", fetcher, 100)
      vi.advanceTimersByTime(150) // stale zone

      // Multiple stale reads — should only trigger one revalidation
      await cache.get("key", fetcher, 100)
      await cache.get("key", fetcher, 100)
      await cache.get("key", fetcher, 100)

      const stats = cache.getStats()
      expect(stats.revalidations).toBe(1)
      expect(fetcher).toHaveBeenCalledTimes(2) // 1 initial + 1 revalidation

      // Clean up
      resolveRevalidation("data-v2")
    })
  })

  describe("get() — EXPIRED", () => {
    it("blocks and fetches fresh data when expired", async () => {
      vi.useFakeTimers()

      let version = 0
      const fetcher = vi.fn().mockImplementation(async () => {
        version++
        return `data-v${version}`
      })

      // Prime
      await cache.get("exp-key", fetcher, 100)

      // Advance past 2*TTL (expired)
      vi.advanceTimersByTime(250)

      const result = await cache.get("exp-key", fetcher, 100)
      expect(result).toBe("data-v2") // fresh data, not stale
      expect(fetcher).toHaveBeenCalledTimes(2)
    })
  })

  describe("invalidate()", () => {
    it("removes specific keys", async () => {
      await cache.get("a", async () => 1, 30_000)
      await cache.get("b", async () => 2, 30_000)
      await cache.get("c", async () => 3, 30_000)

      cache.invalidate("a", "c")

      const stats = cache.getStats()
      expect(stats.size).toBe(1)
      expect(stats.invalidations).toBe(2)
    })

    it("forces fresh fetch on next access", async () => {
      const fetcher = vi.fn().mockResolvedValue("data")

      await cache.get("key", fetcher, 30_000)
      cache.invalidate("key")
      await cache.get("key", fetcher, 30_000)

      expect(fetcher).toHaveBeenCalledTimes(2) // fresh fetch after invalidation
    })

    it("ignores non-existent keys", () => {
      cache.invalidate("nonexistent")
      const stats = cache.getStats()
      expect(stats.invalidations).toBe(0)
    })
  })

  describe("invalidatePrefix()", () => {
    it("removes all keys matching prefix", async () => {
      await cache.get("admin:metrics", async () => 1, 30_000)
      await cache.get("admin:activity", async () => 2, 30_000)
      await cache.get("admin:health", async () => 3, 30_000)
      await cache.get("public:events", async () => 4, 30_000)

      const removed = cache.invalidatePrefix("admin:")

      expect(removed).toBe(3)
      expect(cache.getStats().size).toBe(1)
    })
  })

  describe("clear()", () => {
    it("removes all entries", async () => {
      await cache.get("a", async () => 1, 30_000)
      await cache.get("b", async () => 2, 30_000)

      cache.clear()

      const stats = cache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.invalidations).toBe(2)
    })
  })

  describe("getStats()", () => {
    it("returns empty stats initially", () => {
      const stats = cache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe("0%")
    })

    it("calculates hit rate correctly", async () => {
      await cache.get("key", async () => "data", 30_000) // miss
      await cache.get("key", async () => "data", 30_000) // hit
      await cache.get("key", async () => "data", 30_000) // hit
      await cache.get("key", async () => "data", 30_000) // hit

      const stats = cache.getStats()
      expect(stats.hitRate).toBe("75.0%")
    })

    it("reports entry state correctly", async () => {
      vi.useFakeTimers()

      await cache.get("fresh-key", async () => "data", 1000)

      const stats = cache.getStats()
      expect(stats.entries[0]!.state).toBe("fresh")
      expect(stats.entries[0]!.key).toBe("fresh-key")
    })

    it("reports stale entry state", async () => {
      vi.useFakeTimers()

      await cache.get("stale-key", async () => "data", 100)
      vi.advanceTimersByTime(150) // past TTL, within 2*TTL

      const stats = cache.getStats()
      expect(stats.entries[0]!.state).toBe("stale")
    })

    it("reports expired entry state", async () => {
      vi.useFakeTimers()

      await cache.get("exp-key", async () => "data", 100)
      vi.advanceTimersByTime(250) // past 2*TTL

      const stats = cache.getStats()
      expect(stats.entries[0]!.state).toBe("expired")
    })
  })

  describe("reset()", () => {
    it("clears all data and counters", async () => {
      await cache.get("a", async () => 1, 30_000)
      await cache.get("a", async () => 1, 30_000)

      cache.reset()

      const stats = cache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })

  describe("TTL constants", () => {
    it("has recommended TTLs defined", () => {
      expect(TTL.ACTIVITY).toBe(15_000)
      expect(TTL.METRICS).toBe(30_000)
      expect(TTL.CAPACITY).toBe(60_000)
      expect(TTL.HEALTH).toBe(60_000)
      expect(TTL.FORECAST).toBe(120_000)
      expect(TTL.LEADS_PER_DAY).toBe(60_000)
      expect(TTL.TRENDING).toBe(30_000)
      expect(TTL.VIRAL).toBe(30_000)
    })
  })

  describe("type safety", () => {
    it("preserves value types", async () => {
      interface MetricsData {
        total: number
        routes: string[]
      }

      const data: MetricsData = { total: 100, routes: ["/api/leads"] }
      const result = await cache.get<MetricsData>("typed", async () => data, 30_000)

      expect(result.total).toBe(100)
      expect(result.routes).toEqual(["/api/leads"])
    })
  })

  describe("error handling", () => {
    it("propagates fetcher errors on miss", async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error("DB down"))

      await expect(cache.get("err-key", fetcher, 30_000)).rejects.toThrow("DB down")
    })

    it("keeps stale value if revalidation fails", async () => {
      vi.useFakeTimers()

      let callCount = 0
      const fetcher = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 2) throw new Error("revalidation failed")
        return "original"
      })

      // Prime
      await cache.get("fail-key", fetcher, 100)

      // Move to stale zone
      vi.advanceTimersByTime(150)

      // Should return stale value
      const result = await cache.get("fail-key", fetcher, 100)
      expect(result).toBe("original")

      // Allow revalidation to fail
      await vi.runAllTimersAsync()

      // Value should still be the original (stale)
      const result2 = await cache.get("fail-key", fetcher, 100)
      expect(result2).toBe("original")
    })
  })

  describe("dashboard simulation", () => {
    it("simulates 3 admin tabs polling every 5s for 60s", async () => {
      vi.useFakeTimers()

      let dbQueries = 0
      const fetcher = vi.fn().mockImplementation(async () => {
        dbQueries++
        return { data: `query-${dbQueries}` }
      })

      // Simulate 3 tabs polling every 5s for 60s = 36 requests
      // With cache TTL=30s, we expect:
      //   - 1 initial miss
      //   - ~35 cache hits
      //   - ~1 revalidation
      for (let t = 0; t < 60_000; t += 5_000) {
        vi.setSystemTime(Date.now() + (t === 0 ? 0 : 5_000))
        if (t > 0) vi.advanceTimersByTime(5_000)

        // 3 tabs
        await cache.get("admin:metrics", fetcher, 30_000)
        await cache.get("admin:metrics", fetcher, 30_000)
        await cache.get("admin:metrics", fetcher, 30_000)
      }

      const stats = cache.getStats()
      // Without cache: 36 DB queries
      // With cache: significantly fewer
      expect(dbQueries).toBeLessThan(10)
      expect(stats.hits + stats.staleHits).toBeGreaterThan(25)
    })
  })
})
