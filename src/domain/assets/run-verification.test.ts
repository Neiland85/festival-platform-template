import { describe, it, expect } from "vitest"
import { runVerification, type VerificationCheck } from "./run-verification"

describe("runVerification", () => {
  it("returns passed when all checks succeed", async () => {
    const checks: VerificationCheck[] = [
      { name: "has-readme", check: () => true },
      { name: "has-license", check: () => true },
    ]

    const result = await runVerification("asset-1", checks)
    expect(result.status).toBe("passed")
    expect(result.passed).toBe(2)
    expect(result.total).toBe(2)
    expect(result.errors).toEqual([])
  })

  it("returns failed when a check fails", async () => {
    const checks: VerificationCheck[] = [
      { name: "has-readme", check: () => true },
      { name: "has-tests", check: () => false },
    ]

    const result = await runVerification("asset-1", checks)
    expect(result.status).toBe("failed")
    expect(result.passed).toBe(1)
    expect(result.total).toBe(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("has-tests")
  })

  it("captures thrown errors as failures", async () => {
    const checks: VerificationCheck[] = [
      {
        name: "exploding-check",
        check: () => {
          throw new Error("boom")
        },
      },
    ]

    const result = await runVerification("asset-1", checks)
    expect(result.status).toBe("failed")
    expect(result.passed).toBe(0)
    expect(result.errors[0]).toContain("boom")
  })

  it("handles async checks", async () => {
    const checks: VerificationCheck[] = [
      { name: "async-pass", check: async () => true },
      { name: "async-fail", check: async () => false },
    ]

    const result = await runVerification("asset-1", checks)
    expect(result.passed).toBe(1)
    expect(result.total).toBe(2)
  })

  it("handles empty checks array", async () => {
    const result = await runVerification("asset-1", [])
    expect(result.status).toBe("passed")
    expect(result.passed).toBe(0)
    expect(result.total).toBe(0)
  })
})
