#!/usr/bin/env ts-node
/**
 * Job Flooder — Continuous job injection for soak testing
 *
 * Injects jobs at a steady rate with intentional duplicates
 * to simulate real-world load and test idempotency.
 *
 * Usage:
 *   CHAOS=true RATE=50 ts-node flooder.ts
 *
 * Env vars:
 *   RATE: jobs per second (default: 50)
 *   DURATION_MINUTES: run for N minutes (default: 60)
 *   DUPLICATE_RATE: probability of duplicate idempotency token (default: 0.3)
 */

import { enqueueRedis } from "@/lib/security/redisQueue"
import { log } from "@/lib/logger"
import { randomUUID } from "crypto"

// ── Configuration ──────────────────────────────────────────

const RATE = parseInt(process.env.RATE || "50", 10) // jobs/second
const DURATION_MINUTES = parseInt(process.env.DURATION_MINUTES || "60", 10)
const DUPLICATE_RATE = parseFloat(process.env.DUPLICATE_RATE || "0.3")

// Track issued tokens for intentional duplicates
const issuedTokens: string[] = []
const UNIQUE_TOKEN_POOL_SIZE = 100

// ── Flooder Implementation ─────────────────────────────────

async function generateJob(): Promise<{ idempotencyToken: string; payload: Record<string, unknown> }> {
  // Intentional duplicates: re-use a token from the pool
  let idempotencyToken: string
  if (issuedTokens.length > 0 && Math.random() < DUPLICATE_RATE) {
    // Pick a random token from history (might cause duplicates)
    idempotencyToken = issuedTokens[Math.floor(Math.random() * issuedTokens.length)]
  } else {
    // New token
    idempotencyToken = randomUUID()
    issuedTokens.push(idempotencyToken)

    // Keep pool size bounded
    if (issuedTokens.length > UNIQUE_TOKEN_POOL_SIZE) {
      issuedTokens.shift()
    }
  }

  return {
    idempotencyToken,
    payload: {
      value: Math.random(),
      timestamp: Date.now(),
      jobType: Math.random() > 0.5 ? "create_lead" : "send_email",
    },
  }
}

async function flood() {
  const startTime = Date.now()
  const endTime = startTime + DURATION_MINUTES * 60 * 1000
  let jobsInjected = 0
  let jobsFailed = 0

  log("info", "flooder_started", {
    rate: RATE,
    durationMinutes: DURATION_MINUTES,
    duplicateRate: DUPLICATE_RATE,
  })

  console.log(`
╔════════════════════════════════════════════╗
║     Job Flooder Started                    ║
║     Rate: ${RATE} jobs/sec                 ║
║     Duration: ${DURATION_MINUTES} minutes  ║
║     Duplicate Rate: ${(DUPLICATE_RATE * 100).toFixed(1)}% ║
╚════════════════════════════════════════════╝
  `)

  let batch = 0
  while (Date.now() < endTime) {
    const batchStartTime = Date.now()
    const jobs = []

    // Generate RATE jobs for this second
    for (let i = 0; i < RATE; i++) {
      const job = await generateJob()
      jobs.push(
        enqueueRedis({
          jobId: `job-${randomUUID()}`,
          idempotencyToken: job.idempotencyToken,
          payload: job.payload,
        }).catch((error) => {
          jobsFailed++
          log("error", "flooder_enqueue_failed", {
            error: error instanceof Error ? error.message : String(error),
          })
        })
      )
    }

    // Wait for all jobs to be enqueued
    await Promise.all(jobs)
    jobsInjected += RATE

    // Calculate timing and sleep for remainder of second
    const elapsed = Date.now() - batchStartTime
    const sleepMs = Math.max(0, 1000 - elapsed)

    if (sleepMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepMs))
    }

    batch++

    // Print progress every 10 seconds
    if (batch % 10 === 0) {
      const elapsedMs = Date.now() - startTime
      const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(2)
      const throughput = (jobsInjected / (elapsedMs / 1000)).toFixed(0)

      console.log(
        `[FLOODER] Batch ${batch} | ` +
          `Jobs: ${jobsInjected} | ` +
          `Failed: ${jobsFailed} | ` +
          `Throughput: ${throughput} jobs/sec | ` +
          `Elapsed: ${elapsedMinutes} min`
      )

      log("info", "flooder_progress", {
        batch,
        jobsInjected,
        jobsFailed,
        throughputJobsPerSec: parseFloat(throughput),
        elapsedMinutes: parseFloat(elapsedMinutes),
        uniqueTokensIssued: issuedTokens.length,
      })
    }
  }

  console.log(`
╔════════════════════════════════════════════╗
║     Flooder Completed                      ║
║     Total Jobs Injected: ${jobsInjected}    ║
║     Failed: ${jobsFailed}                  ║
║     Success Rate: ${((1 - jobsFailed / jobsInjected) * 100).toFixed(2)}%   ║
╚════════════════════════════════════════════╝
  `)

  log("info", "flooder_completed", {
    jobsInjected,
    jobsFailed,
    successRate: ((1 - jobsFailed / jobsInjected) * 100).toFixed(2),
    uniqueTokensIssued: issuedTokens.length,
  })

  process.exit(0)
}

// ── Start Flooder ──────────────────────────────────────────

flood().catch((error) => {
  console.error("❌ Flooder failed:", error)
  log("error", "flooder_fatal_error", {
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
