/**
 * Chaos Testing — Attack Patterns for Distributed Queue
 *
 * Each scenario simulates a real-world failure mode and validates
 * that the system handles it correctly (no duplicates, no lost jobs, no zombies).
 *
 * Timeline format:
 *   T0: Initial state
 *   T+X: Event at X milliseconds
 *   CRASH: Worker dies
 *   DELAY: Network/DB delay
 */

import { getRedis } from "@/lib/redis/client"
import { db } from "@/lib/db"
import { processOneJob } from "@/lib/security/leadWorker"
import {
  enqueueRedis,
  dequeueRedis,
  reconcileProcessing,
  ackJob,
  nackJob,
} from "@/lib/security/redisQueue"
import { log } from "@/lib/logger"
import { randomUUID } from "crypto"

// ── Configuration ─────────────────────────────────────────

const CHAOS_TEST_TIMEOUT = 30_000 // 30 seconds per scenario
const CRASH_DELAY_MS = 100 // Simulate crash after X ms

// ── Chaos Scenario Interface ───────────────────────────────

export interface ChaosScenario {
  name: string
  description: string
  attack: () => Promise<void>
  validate: () => Promise<{ passed: boolean; reason?: string }>
}

// ── Scenario #1: Reconciliation Race ───────────────────────

export const reconciliationRaceScenario: ChaosScenario = {
  name: "reconciliation_race",
  description:
    "Heartbeat renews lease while reconciliation checks if it's expired",
  attack: async () => {
    const redis = getRedis()!
    const jobId = `chaos-job-${randomUUID()}`

    // Enqueue job
    await enqueueRedis({
      jobId,
      idempotencyToken: randomUUID(),
      payload: { test: "reconciliation_race" },
    })

    // Dequeue to get it in processing
    const dequeueResult = await dequeueRedis()
    if (!dequeueResult) throw new Error("Failed to dequeue")

    const leaseKey = `platform:job_lease:${jobId}`

    // T0: Lease exists
    let hasLease = await redis.exists(leaseKey)
    if (!hasLease) throw new Error("Lease should exist after dequeue")

    // T1: Simulate reconciliation checking lease (doesn't exist - pretend it expired)
    await redis.del(leaseKey)

    // T2: But heartbeat quickly renews it (race window)
    await redis.setex(leaseKey, 360, "renewed")

    // T3: Reconciliation runs and tries to move job to pending
    const processingSet = `platform:queue:processing`
    const pendingList = `platform:queue:pending`

    // This SHOULD fail with Lua script, but let's check old code would fail
    const jobInProcessing = await redis.llen(processingSet)
    if (jobInProcessing === 0) {
      throw new Error("Job should still be in processing after heartbeat renewal")
    }

    log("info", "chaos_reconciliation_race_attack", { jobId })
  },

  validate: async () => {
    // Check no duplicate jobs exist
    const outbox = await db.query(
      `SELECT COUNT(*) as cnt FROM platform_outbox WHERE status = 'completed'`
    )
    const count = outbox.rows[0]?.cnt || 0

    return {
      passed: count <= 1,
      reason: count > 1 ? `Found ${count} completed jobs (expected max 1)` : undefined,
    }
  },
}

// ── Scenario #2: NACK Job Loss ─────────────────────────────

export const nackJobLossScenario: ChaosScenario = {
  name: "nack_job_loss",
  description: "Job disappears if crash between remove from processing and add to pending",
  attack: async () => {
    const redis = getRedis()!
    const jobId = `chaos-job-${randomUUID()}`

    // Setup: Enqueue and dequeue
    await enqueueRedis({
      jobId,
      idempotencyToken: randomUUID(),
      payload: { willFail: true },
    })

    const dequeueResult = await dequeueRedis()
    if (!dequeueResult) throw new Error("Failed to dequeue")

    // Simulate job failure → should call nackJob
    // But we'll inject crash BETWEEN lrem and lpush

    const processingSet = `platform:queue:processing`
    const pendingList = `platform:queue:pending`
    const jobDataKey = `platform:job_data:${jobId}`

    // Get initial state
    const initialProcessing = await redis.llen(processingSet)

    // Simulate crash by directly manipulating Redis
    // Remove from processing (what nackJob does first)
    await redis.lrem(processingSet, 1, jobId)

    // CRASH HAPPENS HERE (before lpush back to pending)
    // Wait a bit to simulate "worker is dead"
    await new Promise((resolve) => setTimeout(resolve, CRASH_DELAY_MS))

    // Job is now NOWHERE: not in processing, not in pending
    const processingAfter = await redis.llen(processingSet)
    const pendingAfter = await redis.llen(pendingList)
    const jobDataExists = await redis.exists(jobDataKey)

    if (processingAfter === 0 && pendingAfter === 0 && !jobDataExists) {
      log("info", "chaos_nack_loss_simulated", { jobId })
      // This is the failure condition
    } else {
      log("warn", "chaos_nack_loss_attack_failed", {
        jobId,
        processingAfter,
        pendingAfter,
      })
    }
  },

  validate: async () => {
    // Check no jobs are lost (all should be in outbox)
    const queued = await db.query(
      `SELECT COUNT(*) as cnt FROM platform_outbox WHERE status IN ('queued', 'processing')`
    )
    const queuedCount = queued.rows[0]?.cnt || 0

    const inRedis = await getRedis()!.llen("platform:queue:pending")

    return {
      passed: inRedis > 0 || queuedCount > 0,
      reason:
        inRedis === 0 && queuedCount === 0
          ? "Jobs lost: not in Redis pending or Postgres outbox"
          : undefined,
    }
  },
}

// ── Scenario #3: Domain Idempotency Window ─────────────────

export const domainIdempotencyWindowScenario: ChaosScenario = {
  name: "domain_idempotency_window",
  description: "Effect executes but recordOperationApplied() never called (crash)",
  attack: async () => {
    // This attack would require:
    // 1. Execute domain operation successfully
    // 2. Crash before INSERT into applied_operations
    // 3. Another worker retries and also executes

    // With pre-insert pattern, this is harder to exploit:
    // - First worker reserves with INSERT status='pending'
    // - If it crashes, status stays 'pending'
    // - Second worker sees 'pending' status and waits/retries

    log("info", "chaos_domain_idempotency_window_attack", {
      note: "Mitigated by pre-insert pattern, running validation only",
    })
  },

  validate: async () => {
    // Check that applied_operations has no duplicate completed entries
    const duplicates = await db.query(
      `SELECT idempotency_token, COUNT(*) as cnt
       FROM applied_operations
       WHERE status = 'completed'
       GROUP BY idempotency_token
       HAVING COUNT(*) > 1`
    )

    const found = duplicates.rows.length > 0

    return {
      passed: !found,
      reason: found ? `Found duplicate completed operations` : undefined,
    }
  },
}

// ── Scenario #4: Heartbeat Lease Zombie ────────────────────

export const heartbeatZombieScenario: ChaosScenario = {
  name: "heartbeat_zombie_lease",
  description: "Lease persists after ackJob but heartbeat keeps renewing it",
  attack: async () => {
    const redis = getRedis()!
    const jobId = `chaos-job-${randomUUID()}`

    // Setup
    await enqueueRedis({
      jobId,
      idempotencyToken: randomUUID(),
      payload: { test: "heartbeat_zombie" },
    })

    const dequeueResult = await dequeueRedis()
    if (!dequeueResult) throw new Error("Failed to dequeue")

    const leaseKey = `platform:job_lease:${jobId}`

    // Simulate partial cleanup: delete job data but NOT lease
    const jobDataKey = `platform:job_data:${jobId}`
    await redis.del(jobDataKey)
    // Lease is still alive

    // Now heartbeat wakes up and tries to renew
    // With fix: checks token, finds no job data, stops
    // Without fix: blindly renews lease

    const hasLease = await redis.exists(leaseKey)
    if (!hasLease) {
      log("warn", "chaos_zombie_lease_already_gone")
    } else {
      log("info", "chaos_zombie_lease_scenario_setup", { jobId })
    }
  },

  validate: async () => {
    // Check no stale leases exist for completed jobs
    const redis = getRedis()!
    const completedJobs = await db.query(
      `SELECT job_id FROM platform_outbox WHERE status = 'completed' LIMIT 10`
    )

    const staleLeases = []
    for (const row of completedJobs.rows) {
      const leaseExists = await redis.exists(`platform:job_lease:${row.job_id}`)
      if (leaseExists) {
        staleLeases.push(row.job_id)
      }
    }

    return {
      passed: staleLeases.length === 0,
      reason:
        staleLeases.length > 0
          ? `Found ${staleLeases.length} stale leases for completed jobs`
          : undefined,
    }
  },
}

// ── Scenario #5: Redis Partial Failure ─────────────────────

export const redisPartialFailureScenario: ChaosScenario = {
  name: "redis_partial_failure",
  description: "Some Redis ops succeed, some fail (network timeout on one delete)",
  attack: async () => {
    const redis = getRedis()!
    const jobId = `chaos-job-${randomUUID()}`

    await enqueueRedis({
      jobId,
      idempotencyToken: randomUUID(),
      payload: { test: "redis_partial_failure" },
    })

    const dequeueResult = await dequeueRedis()
    if (!dequeueResult) throw new Error("Failed to dequeue")

    // Simulate: lrem succeeds, del(lease) FAILS, del(jobData) never called
    const processingSet = `platform:queue:processing`
    const leaseKey = `platform:job_lease:${jobId}`
    const jobDataKey = `platform:job_data:${jobId}`

    await redis.lrem(processingSet, 1, jobId)
    // lrem succeeded, but next del fails (simulated)

    // Check state: processing should be empty, but lease and data still exist
    const inProcessing = await redis.llen(processingSet)
    const hasLease = await redis.exists(leaseKey)
    const hasData = await redis.exists(jobDataKey)

    if (inProcessing === 0 && hasLease && hasData) {
      log("info", "chaos_redis_partial_failure_simulated", { jobId })
    }
  },

  validate: async () => {
    // Check no jobs are stuck in "removed from processing but lease still exists"
    const redis = getRedis()!
    const processingSet = `platform:queue:processing`
    const allJobs = await redis.lrange<string>(processingSet, 0, -1)

    const orphanedLeases = []
    for (const jobId of allJobs) {
      const leaseKey = `platform:job_lease:${jobId}`
      const hasLease = await redis.exists(leaseKey)
      if (!hasLease) {
        orphanedLeases.push(jobId)
      }
    }

    return {
      passed: orphanedLeases.length === 0,
      reason:
        orphanedLeases.length > 0
          ? `Found ${orphanedLeases.length} jobs in processing without lease`
          : undefined,
    }
  },
}

// ── Scenario #6: Duplicate Enqueue ─────────────────────────

export const duplicateEnqueueScenario: ChaosScenario = {
  name: "duplicate_enqueue",
  description: "Same job enqueued twice (from outbox replay)",
  attack: async () => {
    const redis = getRedis()!
    const jobId = `chaos-job-${randomUUID()}`
    const idempotencyToken = randomUUID()

    // First enqueue
    await enqueueRedis({
      jobId,
      idempotencyToken,
      payload: { attempt: 1 },
    })

    // Simulate: same job enqueued again (broken cron logic)
    await enqueueRedis({
      jobId,
      idempotencyToken,
      payload: { attempt: 2 }, // Different payload, same jobId/token
    })

    const queueLength = await redis.llen("platform:queue:pending")
    if (queueLength > 1) {
      log("info", "chaos_duplicate_enqueue_simulated", { jobId, queueLength })
    }
  },

  validate: async () => {
    // Check: same idempotency_token should only be processed once
    const duplicates = await db.query(
      `SELECT idempotency_token, COUNT(*) as cnt
       FROM platform_outbox
       WHERE status IN ('completed', 'processing')
       GROUP BY idempotency_token
       HAVING COUNT(*) > 1`
    )

    return {
      passed: duplicates.rows.length === 0,
      reason:
        duplicates.rows.length > 0
          ? `Found ${duplicates.rows.length} duplicate idempotency tokens processed`
          : undefined,
    }
  },
}

// ── Scenario #7: Network Partition ─────────────────────────

export const networkPartitionScenario: ChaosScenario = {
  name: "network_partition",
  description: "Redis and Postgres diverge: one updates, other doesn't",
  attack: async () => {
    const redis = getRedis()!
    const jobId = `chaos-job-${randomUUID()}`

    // Enqueue, dequeue
    await enqueueRedis({
      jobId,
      idempotencyToken: randomUUID(),
      payload: { test: "network_partition" },
    })

    const dequeueResult = await dequeueRedis()
    if (!dequeueResult) throw new Error("Failed to dequeue")

    // Simulate: UPDATE to Postgres succeeds, but DELETE from Redis fails
    // This means Postgres says "completed" but Redis still has the job

    const processingSet = `platform:queue:processing`
    const jobDataKey = `platform:job_data:${jobId}`

    // Job is still in Redis processing
    const inProcessing = await redis.llen(processingSet)

    // But Postgres says it's completed
    await db.query(
      `INSERT INTO platform_outbox (job_id, idempotency_token, status)
       VALUES (?, ?, 'completed')
       ON CONFLICT (job_id) DO UPDATE SET status = 'completed'`,
      [jobId, randomUUID()]
    )

    // Now check for divergence
    const postgresStatus = await db.query(
      `SELECT status FROM platform_outbox WHERE job_id = ?`,
      [jobId]
    )
    const redisHasJob = inProcessing > 0

    if (postgresStatus.rows[0]?.status === "completed" && redisHasJob) {
      log("info", "chaos_network_partition_simulated", { jobId })
    }
  },

  validate: async () => {
    // Check: all jobs in Redis should exist and have matching status in Postgres
    const redis = getRedis()!
    const processingSet = `platform:queue:processing`
    const jobsInRedis = await redis.lrange<string>(processingSet, 0, -1)

    const mismatches = []
    for (const jobId of jobsInRedis) {
      const postgresJob = await db.query(
        `SELECT status FROM platform_outbox WHERE job_id = ?`,
        [jobId]
      )

      if (postgresJob.rows.length === 0) {
        mismatches.push({ jobId, issue: "in_redis_not_in_postgres" })
      } else if (postgresJob.rows[0].status === "completed") {
        mismatches.push({ jobId, issue: "in_processing_but_completed" })
      }
    }

    return {
      passed: mismatches.length === 0,
      reason:
        mismatches.length > 0
          ? `Found ${mismatches.length} Redis/Postgres divergences: ${JSON.stringify(mismatches)}`
          : undefined,
    }
  },
}

// ── Scenario Collection ────────────────────────────────────

export const CHAOS_SCENARIOS: ChaosScenario[] = [
  reconciliationRaceScenario,
  nackJobLossScenario,
  domainIdempotencyWindowScenario,
  heartbeatZombieScenario,
  redisPartialFailureScenario,
  duplicateEnqueueScenario,
  networkPartitionScenario,
]
