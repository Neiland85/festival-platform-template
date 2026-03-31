/**
 * SPUD executor — runs a Plan, persisting results to DB.
 *
 * This is the ONLY layer with side effects in the SPUD domain.
 * All I/O is injected via ExecutorDeps (dependency injection for testability).
 *
 * Constraints:
 * - Only DB writes + OpenAI calls (no emails, no webhooks)
 * - Tasks execute sequentially (pool of 3 connections)
 * - If a task fails: mark it failed, mark run failed, skip remaining tasks
 * - Emits audit event on run completion/failure
 */

import { scoreLead } from "./scorer"
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseCampaignResponse,
  validateDraft,
  campaignMemoryKey,
} from "./campaign"
import type {
  Plan,
  RunResult,
  RunStatus,
  TaskStatus,
  LeadData,
  ScoringContext,
  CampaignContext,
  CampaignDraft,
} from "./types"

/* ─── Dependency injection interface ─── */

export interface ExecutorDeps {
  // Run lifecycle
  createRun: (run: {
    type: string
    input: Record<string, unknown>
    actor?: string
  }) => Promise<string>
  updateRun: (
    id: string,
    data: {
      status?: RunStatus
      output?: Record<string, unknown>
      error?: string
      startedAt?: Date
      completedAt?: Date
    },
  ) => Promise<void>

  // Task lifecycle
  createTask: (task: {
    runId: string
    name: string
    action: string
    input: Record<string, unknown>
    seq: number
  }) => Promise<string>
  updateTask: (
    id: string,
    data: {
      status?: TaskStatus
      output?: Record<string, unknown>
      error?: string
      completedAt?: Date
    },
  ) => Promise<void>

  // Data access
  getLeadsBatch: (offset: number, limit: number) => Promise<LeadData[]>
  getScoringContext: (email: string) => Promise<ScoringContext>
  saveScore: (input: {
    leadId: string
    score: number
    tier: string
    factors: Record<string, number>
    runId?: string
  }) => Promise<void>

  // Audit
  emitAudit: (action: string, details: Record<string, unknown>) => void

  // Campaign generation (Phase 3)
  generateCompletion?: (systemPrompt: string, userPrompt: string) => Promise<string>
  getSegmentAggregates?: (segmentId: string) => Promise<CampaignContext>
  setMemory?: (category: string, key: string, value: unknown) => Promise<void>
  getModelName?: () => string
}

/* ─── Executor ─── */

/**
 * Execute a plan: create a run, process each task sequentially,
 * persist scores, and return the result.
 */
export async function executeRun(
  plan: Plan,
  deps: ExecutorDeps,
): Promise<RunResult> {
  const now = new Date()

  // ── Create run ──
  const runId = await deps.createRun({
    type: "scoring",
    input: { goal: plan.goal, params: plan.params ?? {}, taskCount: plan.tasks.length },
  })

  await deps.updateRun(runId, {
    status: "running",
    startedAt: now,
  })

  let tasksCompleted = 0
  let tasksFailed = 0
  let finalStatus: RunStatus = "completed"
  let runError: string | undefined

  // ── Create all task records upfront ──
  const taskIds: string[] = []
  for (const taskDef of plan.tasks) {
    const taskId = await deps.createTask({
      runId,
      name: taskDef.name,
      action: taskDef.action,
      input: taskDef.input,
      seq: taskDef.seq,
    })
    taskIds.push(taskId)
  }

  // ── Execute tasks sequentially ──
  for (let i = 0; i < plan.tasks.length; i++) {
    const taskDef = plan.tasks[i]!
    const taskId = taskIds[i]!

    // If previous task failed, skip remaining
    if (finalStatus === "failed") {
      await deps.updateTask(taskId, { status: "skipped" })
      continue
    }

    await deps.updateTask(taskId, { status: "running" })

    try {
      const result = await executeTask(taskDef, runId, deps)

      await deps.updateTask(taskId, {
        status: "completed",
        output: result,
        completedAt: new Date(),
      })
      tasksCompleted++
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      await deps.updateTask(taskId, {
        status: "failed",
        error: errorMsg,
        completedAt: new Date(),
      })

      tasksFailed++
      finalStatus = "failed"
      runError = `Task ${taskDef.name} failed: ${errorMsg}`
    }
  }

  // ── Finalize run ──
  await deps.updateRun(runId, {
    status: finalStatus,
    output: { tasksCompleted, tasksFailed },
    error: runError,
    completedAt: new Date(),
  })

  deps.emitAudit("spud.run_completed", {
    runId,
    goal: plan.goal,
    status: finalStatus,
    tasksCompleted,
    tasksFailed,
  })

  return { runId, status: finalStatus, tasksCompleted, tasksFailed }
}

/* ─── Task execution ─── */

async function executeTask(
  taskDef: { action: string; input: Record<string, unknown> },
  runId: string,
  deps: ExecutorDeps,
): Promise<Record<string, unknown>> {
  switch (taskDef.action) {
    case "score_batch":
      return executeScoreBatch(taskDef.input, runId, deps)
    case "generate_campaign_draft":
      return executeGenerateCampaign(taskDef.input, runId, deps)
    default:
      throw new Error(`Unknown task action: ${taskDef.action}`)
  }
}

async function executeScoreBatch(
  input: Record<string, unknown>,
  runId: string,
  deps: ExecutorDeps,
): Promise<Record<string, unknown>> {
  const offset = (input["offset"] as number) ?? 0
  const limit = (input["limit"] as number) ?? 500

  const leads = await deps.getLeadsBatch(offset, limit)
  const now = new Date()

  let scored = 0
  const errors: string[] = []

  for (const lead of leads) {
    try {
      const context = await deps.getScoringContext(lead.email)
      const result = scoreLead(lead, context, now)

      await deps.saveScore({
        leadId: result.leadId,
        score: result.score,
        tier: result.tier,
        factors: result.factors,
        runId,
      })
      scored++
    } catch (err) {
      errors.push(`${lead.id}: ${err instanceof Error ? err.message : String(err)}`)
      // Continue scoring other leads — don't fail the whole batch for one lead
    }
  }

  return {
    leadsProcessed: leads.length,
    leadsScored: scored,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/* ─── Campaign generation ─── */

async function executeGenerateCampaign(
  input: Record<string, unknown>,
  runId: string,
  deps: ExecutorDeps,
): Promise<Record<string, unknown>> {
  const segmentId = input["segmentId"] as string
  const tone = (input["tone"] as string) ?? "informativo"
  const language = (input["language"] as string) ?? "es"

  if (!deps.generateCompletion || !deps.getSegmentAggregates || !deps.setMemory) {
    throw new Error("Campaign deps not configured (generateCompletion, getSegmentAggregates, setMemory)")
  }

  // ── 1. Get aggregated segment data ──
  const context = await deps.getSegmentAggregates(segmentId)

  // ── 2. Build prompts (pure domain) ──
  const systemPrompt = buildSystemPrompt(language)
  const userPrompt = buildUserPrompt(context, tone)

  // ── 3. Call LLM via injected adapter ──
  const rawResponse = await deps.generateCompletion(systemPrompt, userPrompt)

  // ── 4. Parse and validate (pure domain) ──
  const parsed = parseCampaignResponse(rawResponse)
  validateDraft(parsed)

  // ── 5. Build draft object ──
  const draft: CampaignDraft = {
    segmentId,
    segmentName: context.segmentName,
    subject: parsed.subject,
    body: parsed.body,
    reasoning: parsed.reasoning,
    tone,
    language,
    generatedAt: new Date().toISOString(),
    modelUsed: deps.getModelName?.() ?? "unknown",
    promptUsed: userPrompt,
    rawResponse,
  }

  // ── 6. Persist in memory ──
  const memKey = campaignMemoryKey(segmentId, runId)
  await deps.setMemory("campaigns", memKey, draft)

  return {
    memoryKey: memKey,
    subject: draft.subject,
    bodyPreview: draft.body.slice(0, 200),
    reasoning: draft.reasoning,
    segmentName: draft.segmentName,
  }
}
