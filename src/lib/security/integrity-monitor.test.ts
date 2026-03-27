import { describe, it, expect, vi, beforeEach } from "vitest"
import { runIntegrityChecks } from "./integrity-monitor"

describe("Integrity Monitor", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  it("detects missing critical environment variables", () => {
    const originalDb = process.env["DATABASE_URL"]
    delete process.env["DATABASE_URL"]

    const checks = runIntegrityChecks()
    const dbCheck = checks.find(c => c.name === "env:DATABASE_URL")

    expect(dbCheck).toBeDefined()
    expect(dbCheck?.status).toBe("fail")

    process.env["DATABASE_URL"] = originalDb
  })

  it("passes when critical vars are present", () => {
    const checks = runIntegrityChecks()
    const sessionCheck = checks.find(c => c.name === "env:SESSION_SECRET")

    // In test env, SESSION_SECRET should be set
    if (process.env["SESSION_SECRET"]) {
      expect(sessionCheck?.status).toBe("pass")
    }
  })

  it("validates Node.js version", () => {
    const checks = runIntegrityChecks()
    const nodeCheck = checks.find(c => c.name === "runtime:node")

    expect(nodeCheck).toBeDefined()
    expect(nodeCheck?.status).toBe("pass")
    expect(nodeCheck?.detail).toContain(process.versions.node)
  })

  it("returns structured results", () => {
    const checks = runIntegrityChecks()

    expect(checks.length).toBeGreaterThan(0)
    for (const check of checks) {
      expect(check).toHaveProperty("name")
      expect(check).toHaveProperty("status")
      expect(check).toHaveProperty("detail")
      expect(["pass", "warn", "fail"]).toContain(check.status)
    }
  })

  it("logs structured JSON", () => {
    runIntegrityChecks()

    expect(console.log).toHaveBeenCalledTimes(1)
    const logCall = vi.mocked(console.log).mock.calls[0]?.[0]
    expect(logCall).toBeDefined()

    const parsed = JSON.parse(logCall as string)
    expect(parsed.event).toBe("integrity_check")
    expect(parsed).toHaveProperty("passed")
    expect(parsed).toHaveProperty("failures")
    expect(parsed).toHaveProperty("total")
  })
})
