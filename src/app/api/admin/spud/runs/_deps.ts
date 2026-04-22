/**
 * Wires up ExecutorDeps from real repositories.
 *
 * This file bridges the domain executor (pure DI) with the actual
 * adapters (DB repositories, audit log, pool queries, OpenAI).
 */

import type { ExecutorDeps } from "@/domain/spud/executor"
import type { LeadData, ScoringContext, CampaignContext } from "@/domain/spud/types"
import {
  createRun,
  updateRun,
  createTask,
  updateTask,
} from "@/adapters/db/spud-run-repository"
import { saveScore } from "@/adapters/db/spud-score-repository"
import { findSegmentById } from "@/adapters/db/spud-segment-repository"
import { setMemory } from "@/adapters/db/spud-memory-repository"
import { persistAuditEvent } from "@/adapters/db/audit-repository"
import { getPool } from "@/adapters/db/pool"
import { generateChatCompletion, getOpenAIClient } from "@/adapters/ai/openai-client"
import { serverEnv } from "@/lib/env"

export interface ExtendedDeps extends ExecutorDeps {
  countLeads: () => Promise<number>
}

export function buildExecutorDeps(): ExtendedDeps {
  const pool = getPool()

  return {
    createRun: (input) => createRun(input),
    updateRun: (id, data) => updateRun(id, data),
    createTask: (input) => createTask(input),
    updateTask: (id, data) =>
      updateTask(id, {
        ...data,
        status: data.status as Parameters<typeof updateTask>[1]["status"],
      }),
    saveScore: (input) => saveScore(input),

    async getLeadsBatch(offset: number, limit: number): Promise<LeadData[]> {
      if (limit === 0) return []

      const result = await pool.query(
        `SELECT id, email, name, surname, phone, profession, source, created_at, event_id
         FROM leads
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         OFFSET $1 LIMIT $2`,
        [offset, limit],
      )

      return result.rows.map((row) => ({
        id: row.id as string,
        email: row.email as string,
        name: row.name as string | null,
        surname: row.surname as string | null,
        phone: row.phone as string | null,
        profession: row.profession as string | null,
        source: row.source as string,
        createdAt: new Date(row.created_at as string),
        eventId: row.event_id as string,
      }))
    },

    async getScoringContext(email: string): Promise<ScoringContext> {
      const [eventRes, orderRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(DISTINCT event_id)::int AS cnt
           FROM leads
           WHERE email = $1 AND deleted_at IS NULL`,
          [email],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS cnt
           FROM orders
           WHERE customer_email = $1 AND status = 'completed'`,
          [email],
        ),
      ])

      return {
        eventCount: (eventRes.rows[0]?.cnt as number) ?? 0,
        completedOrders: (orderRes.rows[0]?.cnt as number) ?? 0,
      }
    },

    emitAudit(action: string, details: Record<string, unknown>): void {
      persistAuditEvent({
        action,
        actor: "spud",
        ip: "internal",
        resource: "spud/run",
        details,
        requestId: `spud-${Date.now()}`,
      })
    },

    async countLeads(): Promise<number> {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM leads WHERE deleted_at IS NULL`,
      )
      return (result.rows[0]?.cnt as number) ?? 0
    },

    // ── Campaign deps (Phase 3) ──

    async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
      return generateChatCompletion(systemPrompt, userPrompt)
    },

    async getSegmentAggregates(segmentId: string): Promise<CampaignContext> {
      const segment = await findSegmentById(segmentId)
      if (!segment) throw new Error(`Segment not found: ${segmentId}`)

      // Aggregate queries — only counts, no individual data
      const [tierRes, sourceRes, professionRes, eventRes] = await Promise.all([
        pool.query(
          `SELECT s.tier, COUNT(*)::int AS cnt
           FROM leads l
           JOIN spud_lead_scores s ON s.lead_id = l.id
           WHERE l.deleted_at IS NULL
           GROUP BY s.tier
           ORDER BY cnt DESC`,
        ),
        pool.query(
          `SELECT l.source, COUNT(*)::int AS cnt
           FROM leads l
           WHERE l.deleted_at IS NULL AND l.source IS NOT NULL
           GROUP BY l.source
           ORDER BY cnt DESC
           LIMIT 5`,
        ),
        pool.query(
          `SELECT l.profession, COUNT(*)::int AS cnt
           FROM leads l
           WHERE l.deleted_at IS NULL AND l.profession IS NOT NULL
           GROUP BY l.profession
           ORDER BY cnt DESC
           LIMIT 5`,
        ),
        pool.query(
          `SELECT e.title, e.id
           FROM events e
           WHERE e.active = true
           ORDER BY e.created_at DESC
           LIMIT 1`,
        ),
      ])

      const tierDist = tierRes.rows
        .map((r) => `${r["tier"]}: ${r["cnt"]}`)
        .join(", ") || "no scores"

      const topSources = sourceRes.rows
        .map((r) => `${r["source"]}: ${r["cnt"]}`)
        .join(", ") || "unknown"

      const topProfs = professionRes.rows
        .map((r) => `${r["profession"]}: ${r["cnt"]}`)
        .join(", ") || "unknown"

      const event = eventRes.rows[0]

      return {
        segmentName: segment.name,
        filters: segment.filters,
        leadCount: segment.leadCount,
        tierDistribution: tierDist,
        topSources: topSources,
        topProfessions: topProfs,
        eventName: event ? (event["title"] as string) : undefined,
      }
    },

    async setMemory(category: string, key: string, value: unknown): Promise<void> {
      await setMemory(category, key, value)
    },

    getModelName(): string {
      return serverEnv.OPENAI_MODEL ?? "gpt-4o-mini"
    },
  }
}
