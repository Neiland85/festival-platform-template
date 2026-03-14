/**
 * Tests para M2: Structured Audit Logger
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  audit,
  getAuditLog,
  resetAuditLog,
  getAuditStats,
  type AuditEntry,
} from "./auditLog"

describe("auditLog", () => {
  beforeEach(() => {
    resetAuditLog()
    vi.restoreAllMocks()
  })

  describe("audit()", () => {
    it("creates an audit entry with required fields", () => {
      const entry = audit({
        action: "leads.export",
        actor: "admin",
        ip: "1.2.3.4",
      })

      expect(entry.level).toBe("audit")
      expect(entry.action).toBe("leads.export")
      expect(entry.actor).toBe("admin")
      expect(entry.ip).toBe("1.2.3.4")
      expect(entry.resource).toBe("-")
      expect(entry.requestId).toMatch(/^aud-/)
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("accepts resource and details", () => {
      const entry = audit({
        action: "event.delete",
        actor: "admin",
        ip: "10.0.0.1",
        resource: "evt-abc-123",
        details: { reason: "duplicate", previousTitle: "Test Event" },
      })

      expect(entry.resource).toBe("evt-abc-123")
      expect(entry.details).toEqual({
        reason: "duplicate",
        previousTitle: "Test Event",
      })
    })

    it("defaults actor to 'system' when no req provided", () => {
      const entry = audit({ action: "system.queue_drain" })
      expect(entry.actor).toBe("system")
    })

    it("defaults ip to 'unknown' when no req provided", () => {
      const entry = audit({ action: "system.metrics_reset" })
      expect(entry.ip).toBe("unknown")
    })

    it("writes structured JSON to stdout", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {})

      audit({
        action: "admin.login",
        actor: "admin",
        ip: "192.168.1.1",
      })

      expect(spy).toHaveBeenCalledOnce()
      const output = spy.mock.calls[0]![0] as string
      const parsed = JSON.parse(output) as AuditEntry
      expect(parsed.level).toBe("audit")
      expect(parsed.action).toBe("admin.login")
    })

    it("generates unique request IDs", () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        vi.spyOn(console, "log").mockImplementation(() => {})
        const entry = audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
        ids.add(entry.requestId)
      }
      expect(ids.size).toBe(100)
    })
  })

  describe("getAuditLog()", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {})
    })

    it("returns empty log initially", () => {
      const result = getAuditLog()
      expect(result.entries).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it("returns entries in reverse chronological order", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.export", actor: "admin", ip: "1.1.1.1" })

      const result = getAuditLog()
      expect(result.entries).toHaveLength(3)
      expect(result.entries[0]!.action).toBe("leads.export")
      expect(result.entries[2]!.action).toBe("admin.login")
    })

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
      }

      const result = getAuditLog({ limit: 3 })
      expect(result.entries).toHaveLength(3)
      expect(result.total).toBe(10)
    })

    it("filters by action", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.export", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })

      const result = getAuditLog({ action: "leads.view" })
      expect(result.entries).toHaveLength(2)
      expect(result.entries.every((e) => e.action === "leads.view")).toBe(true)
    })

    it("filters by actor", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "system.queue_drain", actor: "system", ip: "unknown" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })

      const result = getAuditLog({ actor: "system" })
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0]!.actor).toBe("system")
    })

    it("filters by since timestamp", () => {
      const before = new Date().toISOString()

      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })

      const result = getAuditLog({ since: before })
      expect(result.entries).toHaveLength(2)
    })

    it("combines filters", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "system", ip: "unknown" })
      audit({ action: "leads.export", actor: "admin", ip: "1.1.1.1" })

      const result = getAuditLog({ action: "leads.view", actor: "admin" })
      expect(result.entries).toHaveLength(1)
    })
  })

  describe("ring buffer", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {})
    })

    it("maintains max buffer size of 1000", () => {
      for (let i = 0; i < 1200; i++) {
        audit({
          action: "leads.view",
          actor: "admin",
          ip: "1.1.1.1",
          resource: `lead-${i}`,
        })
      }

      const result = getAuditLog({ limit: 2000 })
      expect(result.bufferSize).toBe(1000)
      expect(result.total).toBe(1200)
    })
  })

  describe("resetAuditLog()", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {})
    })

    it("clears all entries and counters", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })

      resetAuditLog()

      const result = getAuditLog()
      expect(result.entries).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.bufferSize).toBe(0)
    })
  })

  describe("getAuditStats()", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {})
    })

    it("returns empty stats initially", () => {
      const stats = getAuditStats()
      expect(stats.total).toBe(0)
      expect(stats.bufferSize).toBe(0)
      expect(stats.actionCounts).toEqual({})
      expect(stats.lastEntry).toBeNull()
    })

    it("counts actions by type", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.view", actor: "admin", ip: "1.1.1.1" })
      audit({ action: "leads.export", actor: "admin", ip: "1.1.1.1" })

      const stats = getAuditStats()
      expect(stats.actionCounts["admin.login"]).toBe(1)
      expect(stats.actionCounts["leads.view"]).toBe(2)
      expect(stats.actionCounts["leads.export"]).toBe(1)
    })

    it("returns last entry", () => {
      audit({ action: "admin.login", actor: "admin", ip: "1.1.1.1" })
      audit({
        action: "leads.export",
        actor: "admin",
        ip: "1.1.1.1",
        resource: "all-leads",
      })

      const stats = getAuditStats()
      expect(stats.lastEntry).not.toBeNull()
      expect(stats.lastEntry!.action).toBe("leads.export")
      expect(stats.lastEntry!.resource).toBe("all-leads")
    })
  })

  describe("GDPR compliance", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {})
    })

    it("captures all required GDPR fields for PII access", () => {
      const entry = audit({
        action: "leads.view",
        actor: "admin",
        ip: "85.23.45.67",
        resource: "leads-list",
        details: { query: "nerja", resultCount: 15 },
      })

      // Verify all GDPR-required fields present
      expect(entry.timestamp).toBeDefined()
      expect(entry.actor).toBe("admin")
      expect(entry.ip).toBe("85.23.45.67")
      expect(entry.action).toBe("leads.view")
      expect(entry.resource).toBe("leads-list")
      expect(entry.details).toHaveProperty("resultCount", 15)
      expect(entry.requestId).toBeDefined()
    })

    it("tracks lead data export for GDPR accountability", () => {
      audit({
        action: "leads.export",
        actor: "admin",
        ip: "85.23.45.67",
        resource: "leads-csv",
        details: { format: "csv", recordCount: 342, dateRange: "2026-01-01/2026-03-10" },
      })

      const log = getAuditLog({ action: "leads.export" })
      expect(log.entries).toHaveLength(1)
      expect(log.entries[0]!.details).toHaveProperty("recordCount", 342)
    })
  })
})
