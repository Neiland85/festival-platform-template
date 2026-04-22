import { describe, expect, it } from "vitest"
import { resolveInstanceFromHost } from "./instance-resolution"

describe("resolveInstanceFromHost", () => {
  it("resolves instance by host", () => {
    const loaded = resolveInstanceFromHost("example.events.local")

    expect(loaded).not.toBeNull()
    expect(loaded?.instanceId).toBe("client-example")
  })

  it("strips port from host", () => {
    const loaded = resolveInstanceFromHost("example.events.local:3000")

    expect(loaded).not.toBeNull()
    expect(loaded?.instanceId).toBe("client-example")
  })

  it("returns null for unknown host", () => {
    const loaded = resolveInstanceFromHost("missing.local")

    expect(loaded).toBeNull()
  })
})
