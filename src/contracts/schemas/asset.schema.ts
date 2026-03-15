import { z } from "zod"

export const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().min(1).max(2000),
  tagline: z.string().min(1).max(200),
  repoUrl: z.string().url("Must be a valid URL"),
  demoUrl: z.string().url().optional(),
  priceEurCents: z.number().int().min(0),
  stack: z.array(z.string().min(1)).min(1, "At least one stack item is required"),
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>
