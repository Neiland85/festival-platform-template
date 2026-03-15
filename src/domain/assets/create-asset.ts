import type { Asset } from "./types"

export type CreateAssetInput = {
  name: string
  slug: string
  description: string
  tagline: string
  repoUrl: string
  demoUrl?: string
  priceEurCents: number
  stack: string[]
}

export function createAsset(input: CreateAssetInput): Asset {
  const now = new Date().toISOString()

  if (!input.name.trim()) {
    throw new Error("Asset name is required")
  }
  if (!input.slug.trim()) {
    throw new Error("Asset slug is required")
  }
  if (input.priceEurCents < 0) {
    throw new Error("Price cannot be negative")
  }

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    description: input.description.trim(),
    tagline: input.tagline.trim(),
    repoUrl: input.repoUrl,
    demoUrl: input.demoUrl,
    priceEurCents: input.priceEurCents,
    stack: input.stack,
    integrations: [],
    versions: [],
    verification: null,
    createdAt: now,
    updatedAt: now,
  }
}
