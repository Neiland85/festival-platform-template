/**
 * Approvals domain tests — pure functions, no mocks.
 * Includes explicit state matrix validation.
 */

import { describe, it, expect } from "vitest"
import {
  requiresApproval,
  isApprovalExpired,
  canDecide,
  resolveDecision,
  resolveExpired,
  APPROVAL_TTL_MS,
} from "./approvals"

const NOW = new Date("2026-03-31T12:00:00Z")

describe("requiresApproval", () => {
  it("returns true for rescore_segment", () => {
    expect(requiresApproval("rescore_segment")).toBe(true)
  })

  it("returns false for read/scoring goals", () => {
    expect(requiresApproval("score_all")).toBe(false)
    expect(requiresApproval("score_segment")).toBe(false)
    expect(requiresApproval("refresh_segments")).toBe(false)
  })
})

describe("isApprovalExpired", () => {
  it("returns false when within TTL", () => {
    const createdAt = new Date(NOW.getTime() - 1000) // 1s ago
    expect(isApprovalExpired(createdAt, NOW)).toBe(false)
  })

  it("returns false at 23h59m", () => {
    const createdAt = new Date(NOW.getTime() - (APPROVAL_TTL_MS - 60000))
    expect(isApprovalExpired(createdAt, NOW)).toBe(false)
  })

  it("returns true at exactly 24h", () => {
    const createdAt = new Date(NOW.getTime() - APPROVAL_TTL_MS)
    expect(isApprovalExpired(createdAt, NOW)).toBe(true)
  })

  it("returns true past 24h", () => {
    const createdAt = new Date(NOW.getTime() - APPROVAL_TTL_MS - 1)
    expect(isApprovalExpired(createdAt, NOW)).toBe(true)
  })
})

describe("canDecide", () => {
  it("returns true only for pending", () => {
    expect(canDecide("pending")).toBe(true)
  })

  it("returns false for all other statuses", () => {
    expect(canDecide("approved")).toBe(false)
    expect(canDecide("rejected")).toBe(false)
    expect(canDecide("expired")).toBe(false)
    expect(canDecide(null)).toBe(false)
  })
})

describe("resolveDecision", () => {
  it("approved → pending + approved (ready to execute)", () => {
    const result = resolveDecision("approved")
    expect(result.runStatus).toBe("pending")
    expect(result.approvalStatus).toBe("approved")
  })

  it("rejected → cancelled + rejected", () => {
    const result = resolveDecision("rejected")
    expect(result.runStatus).toBe("cancelled")
    expect(result.approvalStatus).toBe("rejected")
  })
})

describe("resolveExpired", () => {
  it("returns cancelled + expired", () => {
    const result = resolveExpired()
    expect(result.runStatus).toBe("cancelled")
    expect(result.approvalStatus).toBe("expired")
  })
})

describe("state matrix validation", () => {
  /**
   * Validates legal combinations of RunStatus × ApprovalStatus.
   */
  const LEGAL_COMBOS = [
    // Normal runs (no approval needed)
    ["pending", null],
    ["running", null],
    ["completed", null],
    ["failed", null],
    ["cancelled", null],
    // Approval workflow
    ["pending", "pending"],     // awaiting decision
    ["pending", "approved"],    // approved, about to execute
    ["running", "approved"],    // executing after approval
    ["completed", "approved"],  // finished after approval
    ["failed", "approved"],     // failed during execution
    ["cancelled", "rejected"],  // rejected by admin
    ["cancelled", "expired"],   // auto-expired
  ] as const

  const ILLEGAL_COMBOS = [
    ["running", "pending"],     // can't run while awaiting approval
    ["running", "rejected"],    // can't run if rejected
    ["running", "expired"],     // can't run if expired
    ["completed", "pending"],   // can't complete without decision
    ["completed", "rejected"],  // can't complete if rejected
    ["completed", "expired"],   // can't complete if expired
    ["failed", "pending"],      // can't fail without starting
    ["failed", "rejected"],     // can't fail if rejected
    ["failed", "expired"],      // can't fail if expired
  ] as const

  it("legal combos are documented", () => {
    expect(LEGAL_COMBOS.length).toBe(12)
  })

  it("illegal combos are documented", () => {
    expect(ILLEGAL_COMBOS.length).toBe(9)
  })

  it("approved decision leads to legal state", () => {
    const { runStatus, approvalStatus } = resolveDecision("approved")
    const combo = [runStatus, approvalStatus]
    const isLegal = LEGAL_COMBOS.some(
      ([r, a]) => r === combo[0] && a === combo[1],
    )
    expect(isLegal).toBe(true)
  })

  it("rejected decision leads to legal state", () => {
    const { runStatus, approvalStatus } = resolveDecision("rejected")
    const combo = [runStatus, approvalStatus]
    const isLegal = LEGAL_COMBOS.some(
      ([r, a]) => r === combo[0] && a === combo[1],
    )
    expect(isLegal).toBe(true)
  })

  it("expired resolution leads to legal state", () => {
    const { runStatus, approvalStatus } = resolveExpired()
    const combo = [runStatus, approvalStatus]
    const isLegal = LEGAL_COMBOS.some(
      ([r, a]) => r === combo[0] && a === combo[1],
    )
    expect(isLegal).toBe(true)
  })
})
