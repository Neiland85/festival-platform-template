import { describe, it, expect } from "vitest"
import { leadCreateSchema } from "@/contracts/schemas/lead.schema"

describe("contracts: leadCreateSchema (Zod)", () => {
  it("accepts valid payload with required fields only", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: true,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
    }
  })

  it("transforms email to lowercase and trimmed", () => {
    const result = leadCreateSchema.safeParse({
      email: "  User@EXAMPLE.com  ",
      eventId: "music",
      consentGiven: true,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
    }
  })

  it("accepts valid payload with honeypot company field", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: true,
      company: "some value",
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid email formats", () => {
    const invalidEmails = [
      "plainaddress",
      "@no-local-part.com",
      "no-at-symbol.com",
      "user@",
    ]

    for (const email of invalidEmails) {
      const result = leadCreateSchema.safeParse({
        email,
        eventId: "music",
        consentGiven: true,
      })

      expect(result.success).toBe(false)
    }
  })

  it("rejects payload with empty eventId", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "",
      consentGiven: true,
    })

    expect(result.success).toBe(false)
  })

  it("rejects payload missing email", () => {
    const result = leadCreateSchema.safeParse({
      eventId: "music",
      consentGiven: true,
    })

    expect(result.success).toBe(false)
  })

  it("rejects payload missing eventId", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      consentGiven: true,
    })

    expect(result.success).toBe(false)
  })

  it("rejects payload with additional properties (strict)", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: true,
      extraField: "should not be allowed",
    })

    expect(result.success).toBe(false)
  })

  it("rejects consentGiven: false", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: false,
    })

    expect(result.success).toBe(false)
  })

  it("rejects invalid phone format", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: true,
      phone: "abc-not-a-phone",
    })

    expect(result.success).toBe(false)
  })

  it("accepts valid phone format", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: true,
      phone: "+34 600 123 456",
    })

    expect(result.success).toBe(true)
  })

  it("accepts all optional fields", () => {
    const result = leadCreateSchema.safeParse({
      email: "user@example.com",
      eventId: "music",
      consentGiven: true,
      name: "Juan",
      surname: "García",
      phone: "+34 600 000 000",
      profession: "Diseñador",
      source: "promo-limitada",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Juan")
      expect(result.data.profession).toBe("Diseñador")
    }
  })
})
