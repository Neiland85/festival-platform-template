import { describe, it, expect, beforeEach, vi } from "vitest"
import { CircuitBreaker, withCircuitBreaker } from "./circuit-breaker"

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker

  beforeEach(() => {
    cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 })
  })

  it("starts in CLOSED state", () => {
    expect(cb.getState().state).toBe("CLOSED")
  })

  it("allows requests in CLOSED state", () => {
    expect(cb.canExecute()).toBe(true)
  })

  it("stays CLOSED on fewer failures than threshold", () => {
    cb.onFailure()
    cb.onFailure()
    expect(cb.getState().state).toBe("CLOSED")
    expect(cb.canExecute()).toBe(true)
  })

  it("opens after reaching failure threshold", () => {
    cb.onFailure()
    cb.onFailure()
    cb.onFailure()
    expect(cb.getState().state).toBe("OPEN")
  })

  it("blocks requests in OPEN state", () => {
    cb.onFailure()
    cb.onFailure()
    cb.onFailure()
    expect(cb.canExecute()).toBe(false)
  })

  it("transitions to HALF_OPEN after timeout", () => {
    cb.onFailure()
    cb.onFailure()
    cb.onFailure()
    expect(cb.getState().state).toBe("OPEN")

    // Simulate time passing
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1100)
    expect(cb.canExecute()).toBe(true)
    expect(cb.getState().state).toBe("HALF_OPEN")
    vi.restoreAllMocks()
  })

  it("closes on success in HALF_OPEN", () => {
    cb.onFailure()
    cb.onFailure()
    cb.onFailure()

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1100)
    cb.canExecute() // triggers HALF_OPEN
    cb.onSuccess()
    expect(cb.getState().state).toBe("CLOSED")
    vi.restoreAllMocks()
  })

  it("re-opens on failure in HALF_OPEN", () => {
    cb.onFailure()
    cb.onFailure()
    cb.onFailure()

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1100)
    cb.canExecute() // triggers HALF_OPEN
    cb.onFailure()
    expect(cb.getState().state).toBe("OPEN")
    vi.restoreAllMocks()
  })

  it("resets to initial state", () => {
    cb.onFailure()
    cb.onFailure()
    cb.onFailure()
    cb.reset()
    expect(cb.getState().state).toBe("CLOSED")
    expect(cb.getState().failures).toBe(0)
  })
})

describe("withCircuitBreaker", () => {
  it("returns result on success", async () => {
    const result = await withCircuitBreaker(async () => "hello")
    expect(result).toBe("hello")
  })

  it("returns null on failure", async () => {
    const result = await withCircuitBreaker(async () => {
      throw new Error("redis down")
    })
    expect(result).toBeNull()
  })
})
