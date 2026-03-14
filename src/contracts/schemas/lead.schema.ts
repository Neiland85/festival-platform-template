import { z } from "zod"

/* ─── Constantes reutilizables ─── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d\s()-]{6,20}$/

/* ─── Schema base: campos que llegan del cliente ─── */
export const leadCreateSchema = z
  .object({
    email: z
      .string()
      .max(320)
      .transform((v) => v.trim().toLowerCase())
      .refine((v) => EMAIL_RE.test(v), { message: "invalid email format" }),
    eventId: z.string().min(1),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: "consent is required" }),
    }),
    name: z.string().max(100).transform((v) => v.trim()).optional(),
    surname: z.string().max(100).transform((v) => v.trim()).optional(),
    phone: z
      .string()
      .max(20)
      .regex(PHONE_RE, "invalid phone format")
      .transform((v) => v.trim())
      .optional(),
    profession: z.string().max(100).transform((v) => v.trim()).optional(),
    source: z.string().max(50).transform((v) => v.trim()).optional(),
    company: z.string().max(200).optional(), // honeypot
  })
  .strict()

/** Tipo inferido del payload validado */
export type LeadCreateInput = z.infer<typeof leadCreateSchema>

/** Schema para el formulario del cliente (sin eventId/source que se inyectan) */
export const leadFormSchema = leadCreateSchema.pick({
  email: true,
  name: true,
  surname: true,
  phone: true,
  profession: true,
})

export type LeadFormInput = z.infer<typeof leadFormSchema>
