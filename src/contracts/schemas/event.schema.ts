import { z } from "zod"

/* ─── Event Create ─── */
export const eventCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    highlight: z.string().min(1).max(100),
    ticketUrl: z.string().url().max(500),
  })
  .strict()

export type EventCreateInput = z.infer<typeof eventCreateSchema>

/* ─── Event Update (partial, at least 1 field) ─── */
export const eventUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    highlight: z.string().min(1).max(100).optional(),
    ticketUrl: z.string().url().max(500).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "at least one field is required",
  })

export type EventUpdateInput = z.infer<typeof eventUpdateSchema>
