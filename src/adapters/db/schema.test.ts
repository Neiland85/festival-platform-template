import { describe, it, expect } from "vitest"
import { events, leads, users, userRoleEnum } from "./schema"
import { getTableName } from "drizzle-orm"

describe("Drizzle schema", () => {
  it("exports events table with correct name", () => {
    expect(getTableName(events)).toBe("events")
  })

  it("exports leads table with correct name", () => {
    expect(getTableName(leads)).toBe("leads")
  })

  it("exports users table with correct name", () => {
    expect(getTableName(users)).toBe("users")
  })

  it("defines user_role enum with expected values", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "editor", "viewer"])
  })

  it("events table has expected columns", () => {
    const cols = Object.keys(events)
    expect(cols).toContain("id")
    expect(cols).toContain("title")
    expect(cols).toContain("description")
    expect(cols).toContain("highlight")
    expect(cols).toContain("ticketUrl")
    expect(cols).toContain("active")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("capacity")
    expect(cols).toContain("eventDate")
    expect(cols).toContain("logo")
  })

  it("leads table has expected columns including profile fields", () => {
    const cols = Object.keys(leads)
    expect(cols).toContain("id")
    expect(cols).toContain("email")
    expect(cols).toContain("eventId")
    expect(cols).toContain("ipAddress")
    expect(cols).toContain("consentGiven")
    expect(cols).toContain("name")
    expect(cols).toContain("surname")
    expect(cols).toContain("phone")
    expect(cols).toContain("profession")
    expect(cols).toContain("source")
    expect(cols).toContain("deletedAt")
    expect(cols).toContain("createdBy")
  })

  it("users table has RBAC fields", () => {
    const cols = Object.keys(users)
    expect(cols).toContain("id")
    expect(cols).toContain("email")
    expect(cols).toContain("passwordHash")
    expect(cols).toContain("role")
    expect(cols).toContain("active")
    expect(cols).toContain("lastLoginAt")
  })
})
