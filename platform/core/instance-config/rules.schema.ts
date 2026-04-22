import { z } from "zod"

export const VisibilitySchema = z.enum([
  "public",
  "unlisted",
  "private",
  "stealth"
])

export const AccessRuleSchema = z.object({
  allow: z.array(z.string().min(1)).optional(),
  deny: z.array(z.string().min(1)).optional(),
  maxPerUser: z.number().int().positive().optional(),
  visibility: VisibilitySchema.optional(),
  tokenRequired: z.boolean().optional()
}).strict()

export const InstanceRulesSchema = z.record(z.string().min(1), AccessRuleSchema)

export type Visibility = z.infer<typeof VisibilitySchema>
export type AccessRule = z.infer<typeof AccessRuleSchema>
export type InstanceRules = z.infer<typeof InstanceRulesSchema>
