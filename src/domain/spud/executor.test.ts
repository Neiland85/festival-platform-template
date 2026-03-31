/**
 * Executor tests — uses injected mocks for all I/O.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { executeRun, type ExecutorDeps } from "./executor"
import type { Plan, LeadData, ScoringContext } from "./types"

/* ─── Helpers ─── */

const NOW = new Date("2026-03-31T12:00:00Z")

function makeDeps(overrides: Partial<ExecutorDeps> = {}): ExecutorDeps {
  return {
    createRun: vi.fn().mockResolvedValue("run-1"),
    updateRun: vi.fn().mockResolvedValue(undefined),
    createTask: vi.fn().mockResolvedValue("task-1"),
    updateTask: vi.fn().mockResolvedValue(undefined),
    getLeadsBatch: vi.fn().mockResolvedValue([]),
    getScoringContext: vi.fn().mockResolvedValue({ eventCount: 0, completedOrders: 0 }),
    saveScore: vi.fn().mockResolvedValue(undefined),
    emitAudit: vi.fn(),
    ...overrides,
  }
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    goal: "score_all",
    tasks: [
      {
        name: "score_batch_1_of_1",
        action: "score_batch",
        input: { offset: 0, limit: 100 },
        seq: 0,
      },
    ],
    ...overrides,
  }
}

const LEAD: LeadData = {
  id: "lead-1",
  email: "test@example.com",
  name: "Ana",
  source: "organic",
  createdAt: NOW,
  eventId: "evt-1",
}

const CONTEXT: ScoringContext = { eventCount: 1, completedOrders: 0 }

/* ─── Tests ─── */

describe("executeRun", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("creates a run and marks it running", async () => {
    const deps = makeDeps()

    await executeRun(makePlan(), deps)

    expect(deps.createRun).toHaveBeenCalledOnce()
    expect(deps.updateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      status: "running",
    }))
  })

  it("completes successfully with no leads", async () => {
    const deps = makeDeps()

    const result = await executeRun(makePlan(), deps)

    expect(result.runId).toBe("run-1")
    expect(result.status).toBe("completed")
    expect(result.tasksCompleted).toBe(1)
    expect(result.tasksFailed).toBe(0)
  })

  it("scores leads in a batch", async () => {
    const deps = makeDeps({
      getLeadsBatch: vi.fn().mockResolvedValue([LEAD]),
      getScoringContext: vi.fn().mockResolvedValue(CONTEXT),
    })

    const result = await executeRun(makePlan(), deps)

    expect(result.status).toBe("completed")
    expect(deps.saveScore).toHaveBeenCalledOnce()
    expect(deps.saveScore).toHaveBeenCalledWith(expect.objectContaining({
      leadId: "lead-1",
      runId: "run-1",
    }))
  })

  it("marks run as failed when a task throws", async () => {
    const deps = makeDeps({
      getLeadsBatch: vi.fn().mockRejectedValue(new Error("DB down")),
    })

    const result = await executeRun(makePlan(), deps)

    expect(result.status).toBe("failed")
    expect(result.tasksFailed).toBe(1)
    expect(result.tasksCompleted).toBe(0)
  })

  it("skips remaining tasks after failure", async () => {
    const plan = makePlan({
      tasks: [
        { name: "batch_1", action: "score_batch", input: { offset: 0, limit: 500 }, seq: 0 },
        { name: "batch_2", action: "score_batch", input: { offset: 500, limit: 500 }, seq: 1 },
      ],
    })

    let taskCounter = 0
    const deps = makeDeps({
      createTask: vi.fn().mockImplementation(() => {
        taskCounter++
        return Promise.resolve(`task-${taskCounter}`)
      }),
      getLeadsBatch: vi.fn()
        .mockRejectedValueOnce(new Error("DB down"))
        .mockResolvedValueOnce([LEAD]),
    })

    const result = await executeRun(plan, deps)

    expect(result.tasksFailed).toBe(1)
    expect(result.tasksCompleted).toBe(0)

    // Second task should be skipped
    expect(deps.updateTask).toHaveBeenCalledWith("task-2", { status: "skipped" })
  })

  it("continues scoring other leads if one lead fails", async () => {
    const leads: LeadData[] = [
      LEAD,
      { ...LEAD, id: "lead-2", email: "fail@example.com" },
      { ...LEAD, id: "lead-3", email: "ok@example.com" },
    ]

    const deps = makeDeps({
      getLeadsBatch: vi.fn().mockResolvedValue(leads),
      getScoringContext: vi.fn().mockImplementation((email: string) => {
        if (email === "fail@example.com") throw new Error("context lookup failed")
        return Promise.resolve(CONTEXT)
      }),
    })

    const result = await executeRun(makePlan(), deps)

    // Task still completes because individual lead errors are caught
    expect(result.status).toBe("completed")
    expect(deps.saveScore).toHaveBeenCalledTimes(2) // lead-1 and lead-3
  })

  it("emits audit event on completion", async () => {
    const deps = makeDeps()

    await executeRun(makePlan(), deps)

    expect(deps.emitAudit).toHaveBeenCalledWith("spud.run_completed", expect.objectContaining({
      runId: "run-1",
      status: "completed",
    }))
  })

  it("emits audit event on failure", async () => {
    const deps = makeDeps({
      getLeadsBatch: vi.fn().mockRejectedValue(new Error("DB down")),
    })

    await executeRun(makePlan(), deps)

    expect(deps.emitAudit).toHaveBeenCalledWith("spud.run_completed", expect.objectContaining({
      status: "failed",
    }))
  })

  it("finalizes run with completedAt timestamp", async () => {
    const deps = makeDeps()

    await executeRun(makePlan(), deps)

    // Last updateRun call should include completedAt
    const lastCall = (deps.updateRun as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    expect(lastCall?.[1]).toHaveProperty("completedAt")
    expect(lastCall?.[1]).toHaveProperty("status", "completed")
  })
})
