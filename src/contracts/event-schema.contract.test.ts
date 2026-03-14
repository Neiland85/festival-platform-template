import { describe, it, expect } from "vitest"
import { eventCreateSchema, eventUpdateSchema } from "@/contracts/schemas/event.schema"

describe("contracts: eventCreateSchema (Zod)", () => {
  it("accepts valid create payload", () => {
    const result = eventCreateSchema.safeParse({
      title: "Sunset Sessions",
      description: "House, disco y electrónica melódica",
      highlight: "Sunset",
      ticketUrl: "https://www.ticketmaster.es/event/123",
    })

    expect(result.success).toBe(true)
  })

  it("rejects missing required fields", () => {
    const result = eventCreateSchema.safeParse({
      title: "Sunset Sessions",
    })

    expect(result.success).toBe(false)
  })

  it("rejects empty title", () => {
    const result = eventCreateSchema.safeParse({
      title: "",
      description: "desc",
      highlight: "hl",
      ticketUrl: "https://example.com",
    })

    expect(result.success).toBe(false)
  })

  it("rejects invalid ticketUrl", () => {
    const result = eventCreateSchema.safeParse({
      title: "Test",
      description: "desc",
      highlight: "hl",
      ticketUrl: "not-a-url",
    })

    expect(result.success).toBe(false)
  })

  it("rejects additional properties (strict)", () => {
    const result = eventCreateSchema.safeParse({
      title: "Test",
      description: "desc",
      highlight: "hl",
      ticketUrl: "https://example.com",
      extraField: "nope",
    })

    expect(result.success).toBe(false)
  })

  it("rejects title exceeding max length", () => {
    const result = eventCreateSchema.safeParse({
      title: "x".repeat(201),
      description: "desc",
      highlight: "hl",
      ticketUrl: "https://example.com",
    })

    expect(result.success).toBe(false)
  })
})

describe("contracts: eventUpdateSchema (Zod)", () => {
  it("accepts partial update with one field", () => {
    const result = eventUpdateSchema.safeParse({
      title: "Updated Title",
    })

    expect(result.success).toBe(true)
  })

  it("accepts update with active boolean", () => {
    const result = eventUpdateSchema.safeParse({
      active: false,
    })

    expect(result.success).toBe(true)
  })

  it("rejects empty object (at least 1 field required)", () => {
    const result = eventUpdateSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it("rejects additional properties (strict)", () => {
    const result = eventUpdateSchema.safeParse({
      title: "Test",
      hackedField: true,
    })

    expect(result.success).toBe(false)
  })

  it("accepts full update payload", () => {
    const result = eventUpdateSchema.safeParse({
      title: "Updated",
      description: "New desc",
      highlight: "New hl",
      ticketUrl: "https://new.example.com",
      active: true,
    })

    expect(result.success).toBe(true)
  })
})
