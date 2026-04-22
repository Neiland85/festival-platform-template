/**
 * Campaign domain tests — pure functions, no mocks.
 * Tests prompt building, JSON parsing, and validation.
 */

import { describe, it, expect } from "vitest"
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseCampaignResponse,
  validateDraft,
  campaignMemoryKey,
  CampaignParseError,
  CampaignValidationError,
} from "./campaign"
import type { CampaignContext } from "./types"

/* ─── Helpers ─── */

function makeContext(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    segmentName: "Hot Referrals",
    filters: { tier: "hot", source: "referral" },
    leadCount: 45,
    tierDistribution: "hot: 45",
    topSources: "referral: 45",
    topProfessions: "Dev: 20, Marketing: 15, Design: 10",
    ...overrides,
  }
}

function makeValidResponse(): string {
  return JSON.stringify({
    subject: "Last chance: exclusive early-bird tickets for Hot Referrals",
    body: "Hello!\n\nAs one of our most engaged community members, you have exclusive early access to tickets.\n\nDon't miss out — only limited spots available.\n\nGrab your tickets now before they sell out!",
    reasoning: "Urgency + exclusivity for hot referral segment with high conversion potential",
  })
}

/* ─── buildSystemPrompt ─── */

describe("buildSystemPrompt", () => {
  it("includes language directive for Spanish", () => {
    const prompt = buildSystemPrompt("es")
    expect(prompt).toContain("Spanish")
    expect(prompt).toContain("JSON")
    expect(prompt).toContain("urgency")
    expect(prompt).toContain("CTA")
  })

  it("includes language directive for English", () => {
    const prompt = buildSystemPrompt("en")
    expect(prompt).toContain("English")
  })

  it("includes language directive for Catalan", () => {
    const prompt = buildSystemPrompt("ca")
    expect(prompt).toContain("Catalan")
  })

  it("mentions JSON response format", () => {
    const prompt = buildSystemPrompt("es")
    expect(prompt).toContain('"subject"')
    expect(prompt).toContain('"body"')
    expect(prompt).toContain('"reasoning"')
  })
})

/* ─── buildUserPrompt ─── */

describe("buildUserPrompt", () => {
  it("includes all context fields", () => {
    const prompt = buildUserPrompt(makeContext(), "formal")

    expect(prompt).toContain("Hot Referrals")
    expect(prompt).toContain("45")
    expect(prompt).toContain("hot: 45")
    expect(prompt).toContain("referral: 45")
    expect(prompt).toContain("Dev: 20")
    expect(prompt).toContain("Tone: formal")
  })

  it("includes event info when present", () => {
    const prompt = buildUserPrompt(
      makeContext({ eventName: "Summer Festival 2026", eventType: "music" }),
      "casual",
    )

    expect(prompt).toContain("Summer Festival 2026")
    expect(prompt).toContain("music")
  })

  it("omits event fields when not present", () => {
    const prompt = buildUserPrompt(makeContext(), "informativo")

    expect(prompt).not.toContain("Event:")
    expect(prompt).not.toContain("Event type:")
  })
})

/* ─── parseCampaignResponse ─── */

describe("parseCampaignResponse", () => {
  it("parses valid JSON response", () => {
    const result = parseCampaignResponse(makeValidResponse())

    expect(result.subject).toContain("Last chance")
    expect(result.body).toContain("early access")
    expect(result.reasoning).toContain("Urgency")
  })

  it("trims whitespace from fields", () => {
    const raw = JSON.stringify({
      subject: "  test subject  ",
      body: "  " + "a".repeat(60) + "  ",
      reasoning: "  reason  ",
    })

    const result = parseCampaignResponse(raw)
    expect(result.subject).toBe("test subject")
    expect(result.reasoning).toBe("reason")
  })

  it("throws CampaignParseError for invalid JSON", () => {
    expect(() => parseCampaignResponse("not json")).toThrow(CampaignParseError)
  })

  it("throws CampaignParseError for non-object JSON", () => {
    expect(() => parseCampaignResponse('"just a string"')).toThrow(CampaignParseError)
    expect(() => parseCampaignResponse("42")).toThrow(CampaignParseError)
  })

  it("throws CampaignParseError when subject is missing", () => {
    const raw = JSON.stringify({ body: "some body text here that is long enough" })
    expect(() => parseCampaignResponse(raw)).toThrow("missing subject or body")
  })

  it("throws CampaignParseError when body is missing", () => {
    const raw = JSON.stringify({ subject: "A subject" })
    expect(() => parseCampaignResponse(raw)).toThrow("missing subject or body")
  })

  it("handles empty reasoning gracefully", () => {
    const raw = JSON.stringify({
      subject: "Test subject",
      body: "a".repeat(60),
    })
    const result = parseCampaignResponse(raw)
    expect(result.reasoning).toBe("")
  })
})

/* ─── validateDraft ─── */

describe("validateDraft", () => {
  it("accepts valid draft", () => {
    expect(() =>
      validateDraft({
        subject: "Great event coming up!",
        body: "a".repeat(100),
        reasoning: "test",
      }),
    ).not.toThrow()
  })

  it("throws for subject too short", () => {
    expect(() =>
      validateDraft({ subject: "Hi", body: "a".repeat(100), reasoning: "" }),
    ).toThrow(CampaignValidationError)
    expect(() =>
      validateDraft({ subject: "Hi", body: "a".repeat(100), reasoning: "" }),
    ).toThrow("too short")
  })

  it("throws for subject too long", () => {
    expect(() =>
      validateDraft({
        subject: "x".repeat(121),
        body: "a".repeat(100),
        reasoning: "",
      }),
    ).toThrow("too long")
  })

  it("throws for body too short", () => {
    expect(() =>
      validateDraft({ subject: "Valid subject", body: "short", reasoning: "" }),
    ).toThrow("Body too short")
  })

  it("throws for body too long", () => {
    expect(() =>
      validateDraft({
        subject: "Valid subject",
        body: "x".repeat(5001),
        reasoning: "",
      }),
    ).toThrow("Body too long")
  })
})

/* ─── campaignMemoryKey ─── */

describe("campaignMemoryKey", () => {
  it("generates correct key format", () => {
    expect(campaignMemoryKey("seg-1", "run-1")).toBe("campaign:seg-1:run-1")
  })
})
