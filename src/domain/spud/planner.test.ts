/**
 * Planner tests — pure functions, no mocks needed.
 */

import { describe, it, expect } from "vitest"
import { createPlan, estimateBatchCount, BATCH_SIZE } from "./planner"

describe("createPlan", () => {
  describe("score_all", () => {
    it("creates a single batch task for small lead counts", () => {
      const plan = createPlan("score_all", 100)

      expect(plan.goal).toBe("score_all")
      expect(plan.tasks).toHaveLength(1)
      expect(plan.tasks[0]!.action).toBe("score_batch")
      expect(plan.tasks[0]!.name).toBe("score_batch_1_of_1")
      expect(plan.tasks[0]!.input).toEqual({ offset: 0, limit: 100 })
      expect(plan.tasks[0]!.seq).toBe(0)
    })

    it("creates multiple batch tasks for large lead counts", () => {
      const plan = createPlan("score_all", 1200)

      expect(plan.tasks).toHaveLength(3)

      expect(plan.tasks[0]!.input).toEqual({ offset: 0, limit: 500 })
      expect(plan.tasks[0]!.name).toBe("score_batch_1_of_3")
      expect(plan.tasks[0]!.seq).toBe(0)

      expect(plan.tasks[1]!.input).toEqual({ offset: 500, limit: 500 })
      expect(plan.tasks[1]!.name).toBe("score_batch_2_of_3")
      expect(plan.tasks[1]!.seq).toBe(1)

      expect(plan.tasks[2]!.input).toEqual({ offset: 1000, limit: 200 })
      expect(plan.tasks[2]!.name).toBe("score_batch_3_of_3")
      expect(plan.tasks[2]!.seq).toBe(2)
    })

    it("creates exactly one task for 0 leads", () => {
      const plan = createPlan("score_all", 0)
      expect(plan.tasks).toHaveLength(1)
      expect(plan.tasks[0]!.input).toEqual({ offset: 0, limit: 0 })
    })

    it("handles exact batch boundary", () => {
      const plan = createPlan("score_all", BATCH_SIZE)
      expect(plan.tasks).toHaveLength(1)
      expect(plan.tasks[0]!.input).toEqual({ offset: 0, limit: BATCH_SIZE })
    })

    it("handles one over batch boundary", () => {
      const plan = createPlan("score_all", BATCH_SIZE + 1)
      expect(plan.tasks).toHaveLength(2)
      expect(plan.tasks[1]!.input).toEqual({ offset: BATCH_SIZE, limit: 1 })
    })
  })

  describe("score_segment", () => {
    it("includes tier filter in task input", () => {
      const plan = createPlan("score_segment", 50, { tier: "cold" })

      expect(plan.goal).toBe("score_segment")
      expect(plan.tasks).toHaveLength(1)
      expect(plan.tasks[0]!.input).toEqual({
        offset: 0,
        limit: 50,
        tierFilter: "cold",
      })
    })

    it("includes source filter in task input", () => {
      const plan = createPlan("score_segment", 50, { source: "organic" })

      expect(plan.tasks[0]!.input).toEqual({
        offset: 0,
        limit: 50,
        sourceFilter: "organic",
      })
    })

    it("includes both filters", () => {
      const plan = createPlan("score_segment", 50, {
        tier: "warm",
        source: "referral",
      })

      expect(plan.tasks[0]!.input).toEqual({
        offset: 0,
        limit: 50,
        tierFilter: "warm",
        sourceFilter: "referral",
      })
    })
  })

  describe("invalid goal", () => {
    it("throws InvalidPlanGoalError for unknown goals", () => {
      expect(() => createPlan("unknown" as never, 10)).toThrow("Invalid plan goal")
    })
  })
})

describe("estimateBatchCount", () => {
  it("returns 1 for small counts", () => {
    expect(estimateBatchCount(0)).toBe(1)
    expect(estimateBatchCount(1)).toBe(1)
    expect(estimateBatchCount(500)).toBe(1)
  })

  it("returns correct count for larger sets", () => {
    expect(estimateBatchCount(501)).toBe(2)
    expect(estimateBatchCount(1000)).toBe(2)
    expect(estimateBatchCount(1001)).toBe(3)
  })
})
