/**
 * SPUD approvals — pure gate logic for human-in-the-loop workflow.
 *
 * No I/O. Approval state is stored as columns on spud_runs.
 *
 * State matrix (RunStatus × ApprovalStatus):
 *   pending  + NULL     → normal run, execute immediately
 *   pending  + pending  → awaiting human decision
 *   pending  + approved → approved, ready to execute
 *   running  + approved → executing after approval
 *   running  + NULL     → executing (no approval needed)
 *   completed+ *        → done
 *   cancelled+ rejected → rejected by admin
 *   cancelled+ expired  → auto-expired
 */

import type { PlanGoal, ApprovalStatus, RunStatus } from "./types"

/** Approval expires 24 hours after creation if no decision. */
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Goals that require admin approval before execution.
 */
export function requiresApproval(goal: PlanGoal): boolean {
  switch (goal) {
    case "rescore_segment":
    case "generate_campaign":
      return true
    case "score_all":
    case "score_segment":
    case "refresh_segments":
      return false
    default:
      return false
  }
}

/**
 * Check if an approval request has expired.
 * Depends on createdAt (when the run/request was created), not decidedAt.
 */
export function isApprovalExpired(
  createdAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() - createdAt.getTime() >= APPROVAL_TTL_MS
}

/**
 * Check if a decision can be made on this approval.
 */
export function canDecide(approvalStatus: ApprovalStatus | null): boolean {
  return approvalStatus === "pending"
}

/**
 * Validate state transitions.
 * Returns the resulting [RunStatus, ApprovalStatus] after a decision.
 */
export function resolveDecision(
  decision: "approved" | "rejected",
): { runStatus: RunStatus; approvalStatus: ApprovalStatus } {
  if (decision === "approved") {
    return { runStatus: "pending", approvalStatus: "approved" }
  }
  return { runStatus: "cancelled", approvalStatus: "rejected" }
}

/**
 * Resolve an expired approval.
 */
export function resolveExpired(): { runStatus: RunStatus; approvalStatus: ApprovalStatus } {
  return { runStatus: "cancelled", approvalStatus: "expired" }
}

export { APPROVAL_TTL_MS }
