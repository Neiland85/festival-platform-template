import { describe, it, expect } from "vitest"
import { createAsset } from "./create-asset"

describe("createAsset", () => {
  const validInput = {
    name: "Festival Template",
    slug: "festival-template",
    description: "A white-label festival platform template",
    tagline: "Launch your festival in minutes",
    repoUrl: "https://github.com/org/festival-template",
    priceEurCents: 1500_00,
    stack: ["Next.js", "TypeScript", "Tailwind"],
  }

  it("creates an asset with valid input", () => {
    const asset = createAsset(validInput)

    expect(asset.id).toBeDefined()
    expect(asset.name).toBe("Festival Template")
    expect(asset.slug).toBe("festival-template")
    expect(asset.priceEurCents).toBe(150000)
    expect(asset.integrations).toEqual([])
    expect(asset.versions).toEqual([])
    expect(asset.verification).toBeNull()
    expect(asset.createdAt).toBeDefined()
  })

  it("trims whitespace from name and slug", () => {
    const asset = createAsset({ ...validInput, name: "  Spaced  ", slug: "  UPPER-Slug  " })
    expect(asset.name).toBe("Spaced")
    expect(asset.slug).toBe("upper-slug")
  })

  it("throws if name is empty", () => {
    expect(() => createAsset({ ...validInput, name: "" })).toThrow("Asset name is required")
  })

  it("throws if slug is empty", () => {
    expect(() => createAsset({ ...validInput, slug: "  " })).toThrow("Asset slug is required")
  })

  it("throws if price is negative", () => {
    expect(() => createAsset({ ...validInput, priceEurCents: -100 })).toThrow(
      "Price cannot be negative"
    )
  })

  it("accepts optional demoUrl", () => {
    const asset = createAsset({ ...validInput, demoUrl: "https://demo.example.com" })
    expect(asset.demoUrl).toBe("https://demo.example.com")
  })

  it("defaults demoUrl to undefined", () => {
    const asset = createAsset(validInput)
    expect(asset.demoUrl).toBeUndefined()
  })
})
