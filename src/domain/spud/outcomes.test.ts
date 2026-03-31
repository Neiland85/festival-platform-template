/**
 * Outcomes domain tests — pure functions, no mocks.
 */

import { describe, it, expect } from "vitest"
import { buildConversionSnapshot } from "./outcomes"

describe("buildConversionSnapshot", () => {
  it("builds snapshot with score data", () => {
    const result = buildConversionSnapshot("lead-1", "order-1", {
      score: 85,
      tier: "hot",
    })

    expect(result).toEqual({
      leadId: "lead-1",
      orderId: "order-1",
      scoreAtConversion: 85,
      tierAtConversion: "hot",
    })
  })

  it("builds snapshot with null score when no score exists", () => {
    const result = buildConversionSnapshot("lead-1", "order-1", null)

    expect(result).toEqual({
      leadId: "lead-1",
      orderId: "order-1",
      scoreAtConversion: null,
      tierAtConversion: null,
    })
  })
})
