import path from "node:path"
import { describe, expect, it } from "vitest"
import { InstanceConfigSchema } from "./config.schema"
import { InstanceRulesSchema, VisibilitySchema } from "./rules.schema"
import { loadInstanceByDomain, loadInstanceFromDirectory } from "./instance-loader"

describe("instance config contracts", () => {
  it("accepts valid instance config", () => {
    const result = InstanceConfigSchema.safeParse({
      name: "client-example",
      domain: "example.local",
      locale: "es",
      currency: "EUR"
    })

    expect(result.success).toBe(true)
  })

  it("accepts valid rules with supported visibility values", () => {
    const result = InstanceRulesSchema.safeParse({
      default: {
        visibility: "public",
        maxPerUser: 10
      },
      vip: {
        visibility: "private",
        tokenRequired: true
      }
    })

    expect(result.success).toBe(true)
  })

  it("rejects unsupported visibility values", () => {
    const result = VisibilitySchema.safeParse("hidden")

    expect(result.success).toBe(false)
  })
})

describe("instance loader", () => {
  const instancesRoot = path.resolve(process.cwd(), "platform/instances")
  const clientExampleDir = path.resolve(process.cwd(), "platform/instances/client-example")

  it("loads an instance from directory", () => {
    const loaded = loadInstanceFromDirectory(clientExampleDir)

    expect(loaded.instanceId).toBe("client-example")
    expect(loaded.config.name).toBe("Client Example Event Platform")
    expect(loaded.rules.default.visibility).toBe("public")
  })

  it("loads an instance by domain", () => {
    const loaded = loadInstanceByDomain(instancesRoot, "example.events.local")

    expect(loaded).not.toBeNull()
    expect(loaded?.instanceId).toBe("client-example")
  })

  it("returns null when domain is unknown", () => {
    const loaded = loadInstanceByDomain(instancesRoot, "missing.local")

    expect(loaded).toBeNull()
  })
})
