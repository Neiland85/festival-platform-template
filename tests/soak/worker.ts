#!/usr/bin/env ts-node
/**
 * Soak Test Worker
 *
 * Single worker process that processes jobs continuously
 * while chaos monkey injects random failures.
 *
 * Run by: soakRunner.ts (spawned as separate process)
 *
 * Env vars:
 *   WORKER_ID: unique worker identifier
 *   CHAOS: "true" to enable chaos monkey
 */

import { processOneJob } from "@/lib/security/leadWorker"
import { log } from "@/lib/logger"
import { getChaosMetrics } from "@/lib/security/chaosMonkey"

const WORKER_ID = process.env.WORKER_ID || "unknown"
const MAX_CONSECUTIVE_FAILURES = 10

// ── Worker State ───────────────────────────────────────────

let jobsProcessed = 0
let jobsSucceeded = 0
let jobsFailed = 0
let consecutiveFailures = 0
let startTime = Date.now()

// ── Worker Loop ────────────────────────────────────────────

async function workerLoop() {
  log("info", "soak_worker_started", {
    workerId: WORKER_ID,
  })

  let lastLogTime = Date.now()

  while (true) {
    try {
      const result = await processOneJob()
      jobsProcessed++

      if (result.success === null) {
        // Queue empty, backoff and retry
        await new Promise((resolve) => setTimeout(resolve, 100))
      } else if (result.success) {
        jobsSucceeded++
        consecutiveFailures = 0
      } else {
        jobsFailed++
        consecutiveFailures++

        // If too many failures, might indicate broken state
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          log("error", "soak_worker_consecutive_failures", {
            workerId: WORKER_ID,
            consecutiveFailures,
            jobsFailed,
          })
          // Continue but log it
        }
      }

      // Log progress every 10 seconds
      const now = Date.now()
      if (now - lastLogTime > 10_000) {
        const elapsedSeconds = (now - startTime) / 1000
        const throughput = (jobsProcessed / elapsedSeconds).toFixed(1)

        log("info", "soak_worker_progress", {
          workerId: WORKER_ID,
          jobsProcessed,
          jobsSucceeded,
          jobsFailed,
          throughputPerSec: parseFloat(throughput),
          consecutiveFailures,
        })

        lastLogTime = now
      }
    } catch (error) {
      jobsFailed++
      consecutiveFailures++

      log("error", "soak_worker_job_error", {
        workerId: WORKER_ID,
        error: error instanceof Error ? error.message : String(error),
      })

      // Brief backoff to avoid tight error loop
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}

// ── Graceful Shutdown ──────────────────────────────────────

process.on("SIGTERM", async () => {
  log("info", "soak_worker_shutdown_requested", {
    workerId: WORKER_ID,
    jobsProcessed,
    jobsSucceeded,
    jobsFailed,
  })

  const elapsedMs = Date.now() - startTime
  const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(2)

  console.log(`
Worker ${WORKER_ID} shutting down:
  Duration: ${elapsedMinutes} min
  Jobs: ${jobsProcessed} (${jobsSucceeded} ok, ${jobsFailed} failed)
  Success Rate: ${((jobsSucceeded / jobsProcessed) * 100).toFixed(1)}%
  `)

  process.exit(0)
})

process.on("SIGKILL", () => {
  log("warn", "soak_worker_killed", {
    workerId: WORKER_ID,
    jobsProcessed,
  })
  process.exit(1)
})

// ── Start Worker Loop ──────────────────────────────────────

workerLoop().catch((error) => {
  console.error(`Worker ${WORKER_ID} fatal error:`, error)
  log("error", "soak_worker_fatal", {
    workerId: WORKER_ID,
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
