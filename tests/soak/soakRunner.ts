#!/usr/bin/env ts-node
/**
 * Soak Test Runner — Long-running chaos test with worker fleet
 *
 * Spawns multiple workers, each processing jobs while chaos monkey
 * injects random failures. Runs for hours to find edge cases.
 *
 * Usage:
 *   CHAOS=true WORKERS=20 DURATION_HOURS=1 ts-node soakRunner.ts
 *
 * Env vars:
 *   WORKERS: number of concurrent workers (default: 20)
 *   DURATION_HOURS: how long to run (default: 1)
 *   CHECK_INTERVAL_SEC: consistency check frequency (default: 10)
 */

import { spawn } from "child_process"
import { log } from "@/lib/logger"
import { validateSystemConsistency } from "../chaos/chaos-validator"
import { getChaosMetrics } from "@/lib/security/chaosMonkey"

// ── Configuration ──────────────────────────────────────────

const NUM_WORKERS = parseInt(process.env.WORKERS || "20", 10)
const DURATION_HOURS = parseInt(process.env.DURATION_HOURS || "1", 10)
const CHECK_INTERVAL_SEC = parseInt(process.env.CHECK_INTERVAL_SEC || "10", 10)
const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000

// ── Soak Test State ────────────────────────────────────────

interface SoakMetrics {
  workersSpawned: number
  workersKilled: number
  checkpointsRun: number
  checkpointsFailed: number
  startTime: number
  endTime?: number
  warnings: string[]
  errors: string[]
}

const soakMetrics: SoakMetrics = {
  workersSpawned: 0,
  workersKilled: 0,
  checkpointsRun: 0,
  checkpointsFailed: 0,
  startTime: Date.now(),
  warnings: [],
  errors: [],
}

const workers: any[] = []

// ── Worker Management ──────────────────────────────────────

function startWorker(id: number) {
  const workerScript = require.resolve("./worker")

  const worker = spawn("pnpm", ["exec", "tsx", workerScript], {
    env: {
      ...process.env,
      CHAOS: "true",
      CHAOS_ERROR_RATE: "0.05",
      CHAOS_LATENCY_RATE: "0.15",
      CHAOS_KILL_RATE: "0.01",
      WORKER_ID: id.toString(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  soakMetrics.workersSpawned++

  // Capture stderr for logs
  worker.stderr?.on("data", (data) => {
    const message = data.toString().trim()
    if (message) {
      log("warn", "worker_stderr", {
        workerId: id,
        message: message.slice(0, 200),
      })
    }
  })

  worker.on("exit", (code, signal) => {
    soakMetrics.workersKilled++

    const reason = signal ? `signal=${signal}` : `code=${code}`
    log("warn", "worker_died", {
      workerId: id,
      reason,
      totalKills: soakMetrics.workersKilled,
    })

    // Restart worker after a brief delay
    if (Date.now() - soakMetrics.startTime < DURATION_MS) {
      setTimeout(() => {
        const newWorker = startWorker(id)
        workers[id] = newWorker
      }, 1000)
    }
  })

  return worker
}

// ── Periodic Consistency Checks ────────────────────────────

async function consistencyCheckpoint() {
  soakMetrics.checkpointsRun++

  try {
    const consistency = await validateSystemConsistency()

    if (!consistency.overall) {
      soakMetrics.checkpointsFailed++
      soakMetrics.errors.push(
        `Consistency check #${soakMetrics.checkpointsRun} failed: system divergence detected`
      )

      log("error", "soak_consistency_failed", {
        checkpoint: soakMetrics.checkpointsRun,
        results: consistency.results.map((r) => ({
          name: r.name,
          passed: r.passed,
          errors: r.errors.slice(0, 2),
        })),
      })
    }
  } catch (error) {
    soakMetrics.checkpointsFailed++
    soakMetrics.errors.push(
      `Consistency check error: ${error instanceof Error ? error.message : String(error)}`
    )

    log("error", "soak_checkpoint_error", {
      checkpoint: soakMetrics.checkpointsRun,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Print progress
  const elapsedMs = Date.now() - soakMetrics.startTime
  const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(1)
  const checkpointFailRate =
    soakMetrics.checkpointsRun > 0
      ? ((soakMetrics.checkpointsFailed / soakMetrics.checkpointsRun) * 100).toFixed(1)
      : "0"

  console.log(
    `[SOAK] Checkpoint #${soakMetrics.checkpointsRun} | ` +
      `Workers: ${soakMetrics.workersSpawned} spawned, ${soakMetrics.workersKilled} killed | ` +
      `Failed Checks: ${soakMetrics.checkpointsFailed}/${soakMetrics.checkpointsRun} (${checkpointFailRate}%) | ` +
      `Elapsed: ${elapsedMinutes} min`
  )
}

// ── Main Soak Test ────────────────────────────────────────

async function soakTest() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║            🔥 SOAK TEST STARTED                            ║
║   Workers: ${NUM_WORKERS}                                  ║
║   Duration: ${DURATION_HOURS} hour(s)                      ║
║   Check Interval: ${CHECK_INTERVAL_SEC}s                   ║
║                                                            ║
║   Chaos Monkey will:                                       ║
║   • Kill workers randomly (1% per op)                      ║
║   • Inject errors (5% per critical point)                  ║
║   • Add latencies (10%, up to 3s)                          ║
║   • Continuously verify consistency                        ║
╚════════════════════════════════════════════════════════════╝
  `)

  log("info", "soak_test_started", {
    workers: NUM_WORKERS,
    durationHours: DURATION_HOURS,
    checkIntervalSec: CHECK_INTERVAL_SEC,
  })

  // Spawn worker fleet
  for (let i = 0; i < NUM_WORKERS; i++) {
    workers.push(startWorker(i))
  }

  // Start consistency check loop
  const checkInterval = setInterval(consistencyCheckpoint, CHECK_INTERVAL_SEC * 1000)

  // Run for specified duration
  setTimeout(async () => {
    clearInterval(checkInterval)
    soakMetrics.endTime = Date.now()

    // Final consistency check
    console.log("\n📊 Running final consistency check...")
    await consistencyCheckpoint()

    // Kill all workers
    console.log("🛑 Stopping all workers...")
    workers.forEach((w) => w.kill("SIGKILL"))

    // Print final report
    printFinalReport()

    process.exit(soakMetrics.checkpointsFailed > 0 ? 1 : 0)
  }, DURATION_MS)
}

// ── Final Report ──────────────────────────────────────────

function printFinalReport() {
  const totalDuration = soakMetrics.endTime! - soakMetrics.startTime
  const totalMinutes = (totalDuration / 1000 / 60).toFixed(1)
  const avgWorkerLifetime =
    soakMetrics.workersKilled > 0 ? (totalDuration / soakMetrics.workersKilled / 1000).toFixed(1) : "N/A"

  const checkpointFailRate =
    soakMetrics.checkpointsRun > 0
      ? ((soakMetrics.checkpointsFailed / soakMetrics.checkpointsRun) * 100).toFixed(1)
      : "0"

  console.log(`
╔════════════════════════════════════════════════════════════╗
║               📈 SOAK TEST FINAL REPORT                    ║
╚════════════════════════════════════════════════════════════╝

Duration: ${totalMinutes} minutes

Workers:
  Spawned: ${soakMetrics.workersSpawned}
  Killed:  ${soakMetrics.workersKilled}
  Avg Lifetime: ${avgWorkerLifetime}s

Consistency Checks:
  Run: ${soakMetrics.checkpointsRun}
  Failed: ${soakMetrics.checkpointsFailed}
  Failure Rate: ${checkpointFailRate}%

${soakMetrics.errors.length > 0 ? `Errors:
${soakMetrics.errors.map((e) => `  ❌ ${e}`).join("\n")}
` : "No errors detected ✅"}

${soakMetrics.checkpointsFailed === 0 ? `
╔════════════════════════════════════════════════════════════╗
║  ✅ SOAK TEST PASSED — System survived ${totalMinutes}min chaos  ║
║  Workers were killed ${soakMetrics.workersKilled} times                  ║
║  No consistency violations detected                        ║
╚════════════════════════════════════════════════════════════╝
` : `
╔════════════════════════════════════════════════════════════╗
║  ❌ SOAK TEST FAILED — ${soakMetrics.checkpointsFailed} consistency violations     ║
╚════════════════════════════════════════════════════════════╝
`}
  `)

  log("info", "soak_test_completed", {
    durationMinutes: parseFloat(totalMinutes),
    workersSpawned: soakMetrics.workersSpawned,
    workersKilled: soakMetrics.workersKilled,
    checkpointsRun: soakMetrics.checkpointsRun,
    checkpointsFailed: soakMetrics.checkpointsFailed,
    failureRate: parseFloat(checkpointFailRate),
    passed: soakMetrics.checkpointsFailed === 0,
  })
}

// ── Start Soak Test ────────────────────────────────────────

soakTest().catch((error) => {
  console.error("❌ Soak test failed:", error)
  log("error", "soak_test_fatal", {
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
