/**
 * OpenAPI 3.1 Specification — auto-generated from Zod schemas.
 *
 * Serves as the single source of truth for the API contract.
 * Schemas are defined in src/contracts/schemas/ and registered here.
 */

import { z } from "zod"

// ── Shared Response Schemas ─────────────────────────

const ErrorResponse = z.object({
  error: z.string(),
})
const SuccessResponse = z.object({
  success: z.literal(true),
})
// ── Auth Schemas ────────────────────────────────────

const LoginRequest = z.object({
  password: z.string().min(1).max(256),
})
// ── Health Schemas ──────────────────────────────────

const HealthResponse = z.object({
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string(),
  uptime: z.number(),
})
// ── Lead Schemas ────────────────────────────────────

const LeadResponse = z.object({
  id: z.string(),
  email: z.string().email(),
  eventId: z.string(),
  name: z.string().nullable(),
  surname: z.string().nullable(),
  phone: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
})
// ── Checkout Schemas ────────────────────────────────

const CheckoutRequest = z.object({
  eventId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).optional(),
})
const CheckoutResponse = z.object({
  url: z.string().url(),
  sessionId: z.string(),
})
// ── OpenAPI Document ────────────────────────────────

export function generateOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Festival Platform API",
      version: "1.0.0",
      description: "API for the Festival Platform Template — events, leads, checkout, and admin operations.",
    },
    servers: [
      { url: "/", description: "Current environment" },
    ],
    paths: {
      "/api/healthz": {
        get: {
          summary: "Health check",
          tags: ["Infrastructure"],
          responses: {
            "200": { description: "Service healthy", content: { "application/json": { schema: zodToJsonSchema(HealthResponse) } } },
          },
        },
      },
      "/api/v1/auth/login": {
        post: {
          summary: "Admin login",
          tags: ["Auth"],
          requestBody: { content: { "application/json": { schema: zodToJsonSchema(LoginRequest) } } },
          responses: {
            "200": { description: "Login successful", content: { "application/json": { schema: zodToJsonSchema(SuccessResponse) } } },
            "401": { description: "Invalid credentials", content: { "application/json": { schema: zodToJsonSchema(ErrorResponse) } } },
            "429": { description: "Rate limited", content: { "application/json": { schema: zodToJsonSchema(ErrorResponse) } } },
          },
        },
      },
      "/api/v1/checkout": {
        post: {
          summary: "Create Stripe checkout session",
          tags: ["Checkout"],
          requestBody: { content: { "application/json": { schema: zodToJsonSchema(CheckoutRequest) } } },
          responses: {
            "200": { description: "Checkout session created", content: { "application/json": { schema: zodToJsonSchema(CheckoutResponse) } } },
            "503": { description: "Stripe not configured", content: { "application/json": { schema: zodToJsonSchema(ErrorResponse) } } },
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: zodToJsonSchema(ErrorResponse),
        SuccessResponse: zodToJsonSchema(SuccessResponse),
        LoginRequest: zodToJsonSchema(LoginRequest),
        HealthResponse: zodToJsonSchema(HealthResponse),
        LeadResponse: zodToJsonSchema(LeadResponse),
        CheckoutRequest: zodToJsonSchema(CheckoutRequest),
        CheckoutResponse: zodToJsonSchema(CheckoutResponse),
      },
    },
  }
}

/** Simple Zod → JSON Schema converter for OpenAPI */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Use zod-openapi's built-in JSON Schema generation
  const jsonSchema = schema._def
  const type = getZodType(schema)

  if (type === "object" && "shape" in jsonSchema) {
    const shape = (jsonSchema as { shape: () => Record<string, z.ZodType> }).shape()
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodType)
      if (!isOptional(value as z.ZodType)) {
        required.push(key)
      }
    }

    return { type: "object", properties, ...(required.length ? { required } : {}) }
  }

  return { type }
}

function getZodType(schema: z.ZodType): string {
  const def = schema._def
  if ("typeName" in def) {
    const name = def.typeName as string
    if (name === "ZodString") return "string"
    if (name === "ZodNumber") return "number"
    if (name === "ZodBoolean") return "boolean"
    if (name === "ZodObject") return "object"
    if (name === "ZodArray") return "array"
    if (name === "ZodEnum") return "string"
    if (name === "ZodLiteral") return typeof (def as { value: unknown }).value === "string" ? "string" : "boolean"
    if (name === "ZodNullable") return getZodType((def as { innerType: z.ZodType }).innerType)
    if (name === "ZodOptional") return getZodType((def as { innerType: z.ZodType }).innerType)
  }
  return "string"
}

function isOptional(schema: z.ZodType): boolean {
  return "_def" in schema && "typeName" in schema._def && schema._def.typeName === "ZodOptional"
}
