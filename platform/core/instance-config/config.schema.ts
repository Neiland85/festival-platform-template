import { z } from "zod"

export const BrandingSchema = z.object({
  primaryColor: z.string().min(1).optional(),
  secondaryColor: z.string().min(1).optional(),
  logo: z.string().min(1).optional()
}).strict()

export const InstanceConfigSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  locale: z.string().min(2),
  currency: z.string().min(3),
  branding: BrandingSchema.optional()
}).strict()

export type InstanceConfig = z.infer<typeof InstanceConfigSchema>
