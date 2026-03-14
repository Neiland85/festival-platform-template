import { describe, it, expect } from "vitest"
import { loginSchema } from "@/contracts/schemas/login.schema"

describe("contracts: loginSchema (Zod)", () => {
  it("accepts valid password", () => {
    const result = loginSchema.safeParse({ password: "s3cretAdmin!" })

    expect(result.success).toBe(true)
  })

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ password: "" })

    expect(result.success).toBe(false)
  })

  it("rejects password exceeding 256 chars", () => {
    const result = loginSchema.safeParse({ password: "x".repeat(257) })

    expect(result.success).toBe(false)
  })

  it("rejects missing password field", () => {
    const result = loginSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it("rejects additional properties (strict)", () => {
    const result = loginSchema.safeParse({ password: "test", extra: "nope" })

    expect(result.success).toBe(false)
  })
})
