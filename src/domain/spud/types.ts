/**
 * SPUD domain types and errors.
 *
 * All types here are pure domain models — no DB or framework dependencies.
 * Used by scorer, planner, executor, memory, segments, approvals, outcomes.
 */

/* ─── Scoring ─── */

export interface LeadData {
  id: string
  email: string
  name?: string | null
  surname?: string | null
  phone?: string | null
  profession?: string | null
  source: string
  createdAt: Date
  eventId: string
}

export interface ScoringContext {
  /** Number of distinct events this email has leads for */
  eventCount: number
  /** Number of completed orders for this email */
  completedOrders: number
}

export type Tier = "hot" | "warm" | "cold"

export interface LeadScore {
  leadId: string
  score: number
  tier: Tier
  factors: Record<string, number>
}

/* ─── Runs & Tasks ─── */

export type RunType = "scoring" | "plan"
export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled"
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped"
export type TaskAction = "score_batch" | "score_segment_batch" | "refresh_segment_count" | "generate_campaign_draft"
export type PlanGoal = "score_all" | "score_segment" | "rescore_segment" | "refresh_segments" | "generate_campaign"

export interface TaskDefinition {
  name: string
  action: TaskAction
  input: Record<string, unknown>
  seq: number
}

export interface Plan {
  goal: PlanGoal
  tasks: TaskDefinition[]
  params?: Record<string, unknown>
}

export interface RunResult {
  runId: string
  status: RunStatus
  tasksCompleted: number
  tasksFailed: number
}

/* ─── Memory (Phase 2) ─── */

export type MemoryCategory = "scoring" | "segments" | "planning" | "general"

/* ─── Segments (Phase 2) ─── */

export interface SegmentFilters {
  tier?: Tier
  source?: string
  minScore?: number
  maxScore?: number
  profession?: string
}

/* ─── Approvals (Phase 2) — modeled as columns on runs ─── */

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired"

/**
 * State matrix between RunStatus and ApprovalStatus:
 *
 *  RunStatus    | ApprovalStatus | Meaning
 *  -------------|----------------|------------------------------------------
 *  pending      | NULL           | Normal run, ready to execute immediately
 *  pending      | pending        | Awaiting human approval
 *  pending      | approved       | Approved, about to execute
 *  running      | approved       | Executing after approval
 *  running      | NULL           | Executing (no approval needed)
 *  completed    | approved       | Finished after approval
 *  completed    | NULL           | Finished (no approval needed)
 *  failed       | approved       | Failed during execution after approval
 *  failed       | NULL           | Failed (no approval needed)
 *  cancelled    | rejected       | Rejected by admin
 *  cancelled    | expired        | Auto-expired after 24h without decision
 *  cancelled    | NULL           | Manually cancelled
 *
 * Invalid combos (enforced by domain logic):
 *  - running + pending/rejected/expired → impossible
 *  - completed + pending/rejected/expired → impossible
 */

/* ─── Outcomes (Phase 2) ─── */

export interface ConversionSnapshot {
  leadId: string
  orderId: string
  scoreAtConversion: number | null
  tierAtConversion: Tier | null
}

/* ─── Campaigns (Phase 3) ─── */

export interface CampaignContext {
  segmentName: string
  filters: SegmentFilters
  leadCount: number
  tierDistribution: string     // "hot: 20, warm: 15, cold: 5"
  topSources: string           // "referral: 25, organic: 15"
  topProfessions: string       // "Dev: 10, Marketing: 8"
  eventName?: string
  eventType?: string
}

export interface CampaignDraft {
  segmentId: string
  segmentName: string
  subject: string
  body: string
  reasoning: string
  tone: string
  language: string
  generatedAt: string
  modelUsed: string
  promptUsed: string
  rawResponse: string
}

/* ─── Domain Errors ─── */

export class LeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`)
    this.name = "LeadNotFoundError"
  }
}

export class RunNotFoundError extends Error {
  constructor(runId: string) {
    super(`Run not found: ${runId}`)
    this.name = "RunNotFoundError"
  }
}

export class InvalidPlanGoalError extends Error {
  constructor(goal: string) {
    super(`Invalid plan goal: ${goal}`)
    this.name = "InvalidPlanGoalError"
  }
}

export class SegmentNotFoundError extends Error {
  constructor(segmentId: string) {
    super(`Segment not found: ${segmentId}`)
    this.name = "SegmentNotFoundError"
  }
}

export class ApprovalNotPendingError extends Error {
  constructor(runId: string, currentStatus: string | null) {
    super(`Run ${runId} approval is not pending (current: ${currentStatus ?? "none"})`)
    this.name = "ApprovalNotPendingError"
  }
}

export class DuplicateRunError extends Error {
  constructor(idempotencyKey: string, existingRunId: string) {
    super(`Run with idempotency key '${idempotencyKey}' already exists: ${existingRunId}`)
    this.name = "DuplicateRunError"
  }
}
