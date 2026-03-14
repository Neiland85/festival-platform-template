import { describe, it, expect } from "vitest"
import { createLead } from "./create-lead"

describe("createLead", () => {
  it("normalizes email to lowercase and sets createdAt", () => {
    const lead = createLead({
      email: "TEST@EXAMPLE.COM",
      eventId: "music",
      ipAddress: "192.168.1.1",
      consentGiven: true,
    })
    expect(lead.email).toBe("test@example.com")
    expect(lead.eventId).toBe("music")
    expect(lead.ipAddress).toBe("192.168.1.1")
    expect(lead.consentGiven).toBe(true)
    expect(lead.source).toBe("organic")
    expect(lead.createdAt).toBeInstanceOf(Date)
    expect(typeof lead.id).toBe("string")
    expect(lead.id.length).toBeGreaterThan(10)
  })

  it("accepts profile fields and custom source", () => {
    const lead = createLead({
      email: "promo@test.com",
      eventId: "promo-limitada",
      ipAddress: "10.0.0.1",
      consentGiven: true,
      name: " Ana ",
      surname: " García López ",
      phone: "+34600111222",
      profession: "Diseñadora",
      source: "promo-limitada",
    })
    expect(lead.name).toBe("Ana")
    expect(lead.surname).toBe("García López")
    expect(lead.phone).toBe("+34600111222")
    expect(lead.profession).toBe("Diseñadora")
    expect(lead.source).toBe("promo-limitada")
  })

  it("omits empty optional fields", () => {
    const lead = createLead({
      email: "basic@test.com",
      eventId: "chambao",
      ipAddress: "1.2.3.4",
      consentGiven: true,
    })
    expect(lead.name).toBeUndefined()
    expect(lead.surname).toBeUndefined()
    expect(lead.phone).toBeUndefined()
    expect(lead.profession).toBeUndefined()
    expect(lead.source).toBe("organic")
  })
})
