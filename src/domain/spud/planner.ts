/**
 * SPUD planner — generates a Plan (batch tasks) from a goal.
 *
 * Pure function, no I/O. The planner creates batch-oriented tasks:
 * instead of one task per lead, it creates `score_batch` tasks that
 * the executor iterates over with pagination.
 *
 * The planner does NOT execute anything — that's the executor's job.
 */

import type { Plan, PlanGoal, TaskDefinition } from "./types"
import { InvalidPlanGoalError } from "./types"

/** Max leads per batch task. Keeps each task within serverless time budgets. */
const BATCH_SIZE = 500

/**
 * Create a plan for the given goal.
 *
 * @param goal       — what to accomplish
 * @param leadCount  — total leads to process (determines number of batch tasks)
 * @param params     — optional extra parameters (e.g. tier filter for score_segment)
 */
export function createPlan(
  goal: PlanGoal,
  leadCount: number,
  params?: Record<string, unknown>,
): Plan {
  switch (goal) {
    case "score_all":
    case "score_segment":
      return buildScoringPlan(goal, leadCount, params)
    case "generate_campaign":
      return buildCampaignPlan(params)
    default:
      throw new InvalidPlanGoalError(goal as string)
  }
}

function buildScoringPlan(
  goal: PlanGoal,
  leadCount: number,
  params?: Record<string, unknown>,
): Plan {
  const batchCount = Math.max(1, Math.ceil(leadCount / BATCH_SIZE))

  const tasks: TaskDefinition[] = []

  for (let i = 0; i < batchCount; i++) {
    const offset = i * BATCH_SIZE
    const limit = Math.min(BATCH_SIZE, leadCount - offset)

    tasks.push({
      name: `score_batch_${i + 1}_of_${batchCount}`,
      action: "score_batch",
      input: {
        offset,
        limit,
        ...(goal === "score_segment" && params?.["tier"]
          ? { tierFilter: params["tier"] }
          : {}),
        ...(goal === "score_segment" && params?.["source"]
          ? { sourceFilter: params["source"] }
          : {}),
      },
      seq: i,
    })
  }

  return {
    goal,
    tasks,
    params,
  }
}

/**
 * Estimate the number of tasks for a given lead count.
 * Useful for dry-run preview.
 */
export function estimateBatchCount(leadCount: number): number {
  return Math.max(1, Math.ceil(leadCount / BATCH_SIZE))
}

/**
 * Build a campaign generation plan.
 * Single task — one LLM call per campaign.
 */
function buildCampaignPlan(params?: Record<string, unknown>): Plan {
  const segmentId = params?.["segmentId"] as string | undefined
  if (!segmentId) {
    throw new Error("generate_campaign requires params.segmentId")
  }

  return {
    goal: "generate_campaign",
    tasks: [
      {
        name: "generate_campaign_draft",
        action: "generate_campaign_draft",
        input: {
          segmentId,
          tone: (params?.["tone"] as string) ?? "informativo",
          language: (params?.["language"] as string) ?? "es",
        },
        seq: 0,
      },
    ],
    params,
  }
}

export { BATCH_SIZE }
