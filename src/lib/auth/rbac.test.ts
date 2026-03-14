import { describe, it, expect } from "vitest"
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  isValidRole,
} from "./rbac"

describe("RBAC", () => {
  describe("admin role", () => {
    it("has all permissions", () => {
      expect(hasPermission("admin", "events:read")).toBe(true)
      expect(hasPermission("admin", "events:create")).toBe(true)
      expect(hasPermission("admin", "events:delete")).toBe(true)
      expect(hasPermission("admin", "leads:read")).toBe(true)
      expect(hasPermission("admin", "leads:export")).toBe(true)
      expect(hasPermission("admin", "users:manage")).toBe(true)
      expect(hasPermission("admin", "system:admin")).toBe(true)
    })
  })

  describe("editor role", () => {
    it("can CRUD events", () => {
      expect(hasPermission("editor", "events:read")).toBe(true)
      expect(hasPermission("editor", "events:create")).toBe(true)
      expect(hasPermission("editor", "events:update")).toBe(true)
      expect(hasPermission("editor", "events:delete")).toBe(true)
    })

    it("can read leads and dashboard", () => {
      expect(hasPermission("editor", "leads:read")).toBe(true)
      expect(hasPermission("editor", "dashboard:read")).toBe(true)
    })

    it("cannot manage users or system", () => {
      expect(hasPermission("editor", "users:manage")).toBe(false)
      expect(hasPermission("editor", "system:admin")).toBe(false)
      expect(hasPermission("editor", "leads:export")).toBe(false)
    })
  })

  describe("viewer role", () => {
    it("can only read", () => {
      expect(hasPermission("viewer", "events:read")).toBe(true)
      expect(hasPermission("viewer", "leads:read")).toBe(true)
      expect(hasPermission("viewer", "dashboard:read")).toBe(true)
    })

    it("cannot write or manage", () => {
      expect(hasPermission("viewer", "events:create")).toBe(false)
      expect(hasPermission("viewer", "events:update")).toBe(false)
      expect(hasPermission("viewer", "events:delete")).toBe(false)
      expect(hasPermission("viewer", "leads:export")).toBe(false)
      expect(hasPermission("viewer", "users:manage")).toBe(false)
      expect(hasPermission("viewer", "system:admin")).toBe(false)
    })
  })

  describe("hasAllPermissions", () => {
    it("returns true when role has all specified permissions", () => {
      expect(
        hasAllPermissions("admin", ["events:read", "users:manage"])
      ).toBe(true)
    })

    it("returns false when missing any permission", () => {
      expect(
        hasAllPermissions("viewer", ["events:read", "events:create"])
      ).toBe(false)
    })
  })

  describe("hasAnyPermission", () => {
    it("returns true when role has at least one permission", () => {
      expect(
        hasAnyPermission("viewer", ["users:manage", "dashboard:read"])
      ).toBe(true)
    })

    it("returns false when role has none", () => {
      expect(
        hasAnyPermission("viewer", ["users:manage", "system:admin"])
      ).toBe(false)
    })
  })

  describe("getPermissions", () => {
    it("returns all permissions for a role", () => {
      const perms = getPermissions("viewer")
      expect(perms).toContain("events:read")
      expect(perms).toContain("leads:read")
      expect(perms).toContain("dashboard:read")
      expect(perms).toHaveLength(3)
    })
  })

  describe("isValidRole", () => {
    it("validates known roles", () => {
      expect(isValidRole("admin")).toBe(true)
      expect(isValidRole("editor")).toBe(true)
      expect(isValidRole("viewer")).toBe(true)
    })

    it("rejects unknown values", () => {
      expect(isValidRole("superadmin")).toBe(false)
      expect(isValidRole("")).toBe(false)
      expect(isValidRole("root")).toBe(false)
    })
  })
})
