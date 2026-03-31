/**
 * SPUD Zod contracts — request/response validation schemas.
 *
 * Used by API route handlers to validate incoming data.
 * Strict mode: rejects extra properties.
 */

import { z } from "zod"

/* ─── Score request ─── */

export const scoreLeadSchema = z
  .object({
    leadId: z.string().min(1, "leadId is required"),
  })
  .strict()

export type ScoreLeadInput = z.infer<typeof scoreLeadSchema>

/* ─── Plan request (Phase 2: extended goals + idempotencyKey) ─── */

export const createPlanSchema = z
  .object({
    goal: z.enum(["score_all", "score_segment", "rescore_segment", "refresh_segments", "generate_campaign"]),
    params: z.record(z.unknown()).optional(),
    idempotencyKey: z.string().max(255).optional(),
  })
  .strict()

export type CreatePlanInput = z.infer<typeof createPlanSchema>

/* ─── Query params ─── */

export const spudRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["scoring", "plan"]).optional(),
  status: z
    .enum(["pending", "running", "completed", "failed", "cancelled"])
    .optional(),
})

export type SpudRunsQuery = z.infer<typeof spudRunsQuerySchema>

export const spudScoresQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  tier: z.enum(["hot", "warm", "cold"]).optional(),
})

export type SpudScoresQuery = z.infer<typeof spudScoresQuerySchema>

/* ─── Memory (Phase 2) ─── */

export const setMemorySchema = z
  .object({
    category: z
      .enum(["scoring", "segments", "planning", "general"])
      .default("general"),
    key: z.string().min(1).max(255),
    value: z.unknown(),
    ttlSeconds: z.number().int().min(60).max(2592000).optional(), // 1min – 30d
  })
  .strict()

export type SetMemoryInput = z.infer<typeof setMemorySchema>

export const memoryQuerySchema = z.object({
  category: z
    .enum(["scoring", "segments", "planning", "general"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type MemoryQuery = z.infer<typeof memoryQuerySchema>

/* ─── Segments (Phase 2) ─── */

export const createSegmentSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    filters: z.object({
      tier: z.enum(["hot", "warm", "cold"]).optional(),
      source: z.string().min(1).optional(),
      minScore: z.number().int().min(0).max(100).optional(),
      maxScore: z.number().int().min(0).max(100).optional(),
      profession: z.string().min(1).optional(),
    }),
  })
  .strict()

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>

export const segmentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/* ─── Approvals (Phase 2) ─── */

export const decideApprovalSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().max(500).optional(),
  })
  .strict()

export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>

/* ─── Outcomes (Phase 2) ─── */

export const outcomesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
