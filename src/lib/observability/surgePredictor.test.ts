/**
 * Tests para M3: Traffic Surge Predictor
 *
 * Adaptado a la API actual de surgePredictor.ts:
 *   recordLead(), getSurgeStatus(), resetSurgePredictor(), predict15m()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  recordLead,
  getSurgeStatus,
  resetSurgePredictor,
  predict15m,
} from "./surgePredictor"

describe("surgePredictor", () => {
  beforeEach(() => {
    resetSurgePredictor()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("recordLead()", () => {
    it("increments current bucket count", () => {
      recordLead()
      recordLead()
      recordLead()

      const status = getSurgeStatus()
      expect(status.currentRate).toBe(3)
    })

    it("starts with zero state", () => {
      const status = getSurgeStatus()
      expect(status.currentRate).toBe(0)
      expect(status.level).toBe("NORMAL")
    })
  })

  describe("getSurgeStatus()", () => {
    it("returns NORMAL for low traffic", () => {
      for (let i = 0; i < 5; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.level).toBe("NORMAL")
      expect(status.currentRate).toBe(5)
    })

    it("returns ELEVATED for moderate traffic (20-49/min)", () => {
      for (let i = 0; i < 25; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.level).toBe("ELEVATED")
      expect(status.currentRate).toBe(25)
    })

    it("returns HIGH for heavy traffic (50-99/min)", () => {
      for (let i = 0; i < 75; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.level).toBe("HIGH")
      expect(status.currentRate).toBe(75)
    })

    it("returns SURGE for extreme traffic (100+/min)", () => {
      for (let i = 0; i < 150; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.level).toBe("SURGE")
      expect(status.currentRate).toBe(150)
    })

    it("tracks peak rate across window", () => {
      vi.useFakeTimers()

      for (let i = 0; i < 50; i++) recordLead()
      vi.advanceTimersByTime(60_000) // next bucket

      for (let i = 0; i < 10; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.peak).toBe(50)
    })

    it("calculates average rate from buckets", () => {
      vi.useFakeTimers()

      for (let i = 0; i < 10; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      for (let i = 0; i < 20; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      for (let i = 0; i < 30; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.average).toBe(20) // (10+20+30) / 3
    })

    it("includes collectedAt timestamp", () => {
      const status = getSurgeStatus()
      expect(status.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("includes bucket snapshots in reverse order (newest first)", () => {
      vi.useFakeTimers()

      for (let i = 0; i < 10; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      for (let i = 0; i < 20; i++) recordLead()

      const status = getSurgeStatus()
      expect(status.buckets).toHaveLength(2)
      expect(status.buckets[0]!.count).toBe(20) // newest first
      expect(status.buckets[1]!.count).toBe(10)
    })
  })

  describe("predict15m()", () => {
    it("predicts higher rate when gradient is positive", () => {
      vi.useFakeTimers()

      for (let i = 0; i < 10; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      for (let i = 0; i < 40; i++) recordLead() // gradient = 40-10 = 30

      const prediction = predict15m()
      expect(prediction).toBeGreaterThan(40)
    })

    it("returns current rate when no gradient data", () => {
      for (let i = 0; i < 20; i++) recordLead()

      const prediction = predict15m()
      expect(prediction).toBe(20) // single bucket, no gradient
    })

    it("returns 0 or positive for negative gradient predictions", () => {
      vi.useFakeTimers()

      for (let i = 0; i < 100; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      for (let i = 0; i < 5; i++) recordLead() // big drop

      const prediction = predict15m()
      expect(prediction).toBeGreaterThanOrEqual(0)
    })

    it("caps prediction at 10000", () => {
      vi.useFakeTimers()

      for (let i = 0; i < 1; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      for (let i = 0; i < 5000; i++) recordLead()

      const prediction = predict15m()
      expect(prediction).toBeLessThanOrEqual(10000)
    })
  })

  describe("window management", () => {
    it("limits to 30 buckets max", () => {
      vi.useFakeTimers()

      for (let min = 0; min < 35; min++) {
        recordLead()
        vi.advanceTimersByTime(60_000)
      }

      const status = getSurgeStatus()
      expect(status.buckets.length).toBeLessThanOrEqual(30)
    })
  })

  describe("resetSurgePredictor()", () => {
    it("clears all state", () => {
      for (let i = 0; i < 50; i++) recordLead()

      resetSurgePredictor()

      const status = getSurgeStatus()
      expect(status.currentRate).toBe(0)
      expect(status.level).toBe("NORMAL")
      expect(status.peak).toBe(0)
    })
  })

  describe("festival scenario simulation", () => {
    it("simulates Solaris Nerja lineup drop traffic pattern", () => {
      vi.useFakeTimers()

      // Normal traffic: 5-8 leads/min for 5 minutes
      for (let min = 0; min < 5; min++) {
        const count = 5 + Math.floor(min * 0.6)
        for (let i = 0; i < count; i++) recordLead()
        vi.advanceTimersByTime(60_000)
      }

      // Ramp up: announcement on social media
      for (let i = 0; i < 35; i++) recordLead()
      vi.advanceTimersByTime(60_000)

      // Surge: going viral
      for (let i = 0; i < 150; i++) recordLead()

      const status = getSurgeStatus()

      // Should detect SURGE
      expect(status.level).toBe("SURGE")
      expect(status.currentRate).toBe(150)
      expect(status.peak).toBe(150)
    })
  })
})
