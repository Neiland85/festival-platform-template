/**
 * SPUD run & task repository — Drizzle ORM query builder.
 *
 * Manages the lifecycle of runs (scoring batches, plans) and their
 * individual tasks. Tasks belong to runs (1:N).
 *
 * Phase 2: adds approval columns and idempotency key.
 */

import { eq, desc, isNotNull } from "drizzle-orm"
import { getDb } from "./drizzle"
import { spudRuns, spudTasks } from "./schema"
import type { RunStatus, TaskStatus, ApprovalStatus } from "@/domain/spud/types"

/* ─── Types ─── */

export type CreateRunInput = {
  type: string
  input: Record<string, unknown>
  actor?: string
  idempotencyKey?: string
  approvalStatus?: ApprovalStatus
  approvalRequestedBy?: string
}

export type UpdateRunInput = {
  status?: RunStatus
  output?: Record<string, unknown>
  error?: string
  startedAt?: Date
  completedAt?: Date
  approvalStatus?: ApprovalStatus
  approvalDecidedBy?: string
  approvalDecidedAt?: Date
  approvalReason?: string
}

export type RunRow = {
  id: string
  type: string
  status: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  actor: string
  idempotencyKey: string | null
  approvalStatus: string | null
  approvalRequestedBy: string | null
  approvalDecidedBy: string | null
  approvalDecidedAt: Date | null
  approvalReason: string | null
}

export type CreateTaskInput = {
  runId: string
  name: string
  action: string
  input: Record<string, unknown>
  seq: number
}

export type UpdateTaskInput = {
  status?: TaskStatus
  output?: Record<string, unknown>
  error?: string
  completedAt?: Date
}

export type TaskRow = {
  id: string
  runId: string
  name: string
  action: string
  status: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  seq: number
  createdAt: Date
  completedAt: Date | null
}

/* ─── Runs ─── */

export async function createRun(input: CreateRunInput): Promise<string> {
  const db = getDb()

  const rows = await db
    .insert(spudRuns)
    .values({
      type: input.type,
      input: JSON.stringify(input.input),
      actor: input.actor ?? "system",
      idempotencyKey: input.idempotencyKey ?? null,
      approvalStatus: input.approvalStatus ?? null,
      approvalRequestedBy: input.approvalRequestedBy ?? null,
    })
    .returning({ id: spudRuns.id })

  return rows[0]!.id
}

export async function updateRun(id: string, data: UpdateRunInput): Promise<void> {
  const db = getDb()

  const set: Partial<typeof spudRuns.$inferInsert> = {}
  if (data.status !== undefined) set.status = data.status
  if (data.output !== undefined) set.output = JSON.stringify(data.output)
  if (data.error !== undefined) set.error = data.error
  if (data.startedAt !== undefined) set.startedAt = data.startedAt
  if (data.completedAt !== undefined) set.completedAt = data.completedAt
  if (data.approvalStatus !== undefined) set.approvalStatus = data.approvalStatus
  if (data.approvalDecidedBy !== undefined) set.approvalDecidedBy = data.approvalDecidedBy
  if (data.approvalDecidedAt !== undefined) set.approvalDecidedAt = data.approvalDecidedAt
  if (data.approvalReason !== undefined) set.approvalReason = data.approvalReason

  if (Object.keys(set).length === 0) return

  await db
    .update(spudRuns)
    .set(set)
    .where(eq(spudRuns.id, id))
}

export async function findRuns(opts?: {
  type?: string
  status?: string
  limit?: number
}): Promise<RunRow[]> {
  const db = getDb()
  const limit = opts?.limit ?? 20

  let query = db
    .select()
    .from(spudRuns)
    .orderBy(desc(spudRuns.createdAt))
    .limit(limit)
    .$dynamic()

  if (opts?.type) {
    query = query.where(eq(spudRuns.type, opts.type))
  }
  if (opts?.status) {
    query = query.where(eq(spudRuns.status, opts.status as RunStatus))
  }

  const rows = await query
  return rows.map(parseRunRow)
}

export async function findRunById(id: string): Promise<RunRow | null> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudRuns)
    .where(eq(spudRuns.id, id))
    .limit(1)

  if (rows.length === 0) return null
  return parseRunRow(rows[0]!)
}

/**
 * Find a run by idempotency key. Returns null if not found.
 */
export async function findRunByIdempotencyKey(key: string): Promise<RunRow | null> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudRuns)
    .where(eq(spudRuns.idempotencyKey, key))
    .limit(1)

  if (rows.length === 0) return null
  return parseRunRow(rows[0]!)
}

/**
 * Find runs awaiting approval.
 */
export async function findRunsAwaitingApproval(limit = 20): Promise<RunRow[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudRuns)
    .where(isNotNull(spudRuns.approvalStatus))
    .orderBy(desc(spudRuns.createdAt))
    .limit(limit)

  return rows.map(parseRunRow)
}

/* ─── Tasks ─── */

export async function createTask(input: CreateTaskInput): Promise<string> {
  const db = getDb()

  const rows = await db
    .insert(spudTasks)
    .values({
      runId: input.runId,
      name: input.name,
      action: input.action,
      input: JSON.stringify(input.input),
      seq: input.seq,
    })
    .returning({ id: spudTasks.id })

  return rows[0]!.id
}

export async function updateTask(id: string, data: UpdateTaskInput): Promise<void> {
  const db = getDb()

  const set: Partial<typeof spudTasks.$inferInsert> = {}
  if (data.status !== undefined) set.status = data.status
  if (data.output !== undefined) set.output = JSON.stringify(data.output)
  if (data.error !== undefined) set.error = data.error
  if (data.completedAt !== undefined) set.completedAt = data.completedAt

  if (Object.keys(set).length === 0) return

  await db
    .update(spudTasks)
    .set(set)
    .where(eq(spudTasks.id, id))
}

export async function findTasksByRunId(runId: string): Promise<TaskRow[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(spudTasks)
    .where(eq(spudTasks.runId, runId))
    .orderBy(spudTasks.seq)

  return rows.map(parseTaskRow)
}

/* ─── Helpers ─── */

function parseJsonField(val: string | null): Record<string, unknown> | null {
  if (val == null) return null
  try {
    return JSON.parse(val) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseRunRow(row: typeof spudRuns.$inferSelect): RunRow {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    input: parseJsonField(row.input) ?? {},
    output: parseJsonField(row.output ?? null),
    error: row.error,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    actor: row.actor,
    idempotencyKey: row.idempotencyKey,
    approvalStatus: row.approvalStatus,
    approvalRequestedBy: row.approvalRequestedBy,
    approvalDecidedBy: row.approvalDecidedBy,
    approvalDecidedAt: row.approvalDecidedAt,
    approvalReason: row.approvalReason,
  }
}

function parseTaskRow(row: typeof spudTasks.$inferSelect): TaskRow {
  return {
    id: row.id,
    runId: row.runId,
    name: row.name,
    action: row.action,
    status: row.status,
    input: parseJsonField(row.input) ?? {},
    output: parseJsonField(row.output ?? null),
    error: row.error,
    seq: row.seq,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  }
}
