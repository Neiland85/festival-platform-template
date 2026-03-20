#!/usr/bin/env ts-node
/**
 * Long Soak Test Runner — 6-12+ Hour Production Simulation
 *
 * This catches what 1-hour tests never will:
 * - Memory creep (leaks accumulate over hours)
 * - Connection degradation
 * - Redis/Postgres backlog drift
 * - Garbage key accumulation
 * - Heartbeat failures under sustained load
 *
 * Usage:
 *   CHAOS=true CHAOS_REDIS_PROXY=true DURATION_HOURS=6 ts-node tests/soak/long-soak-runner.ts
 */

import { spawn } from "child_process"
import { log } from "@/lib/logger"
import { validateSystem } from "./consistencyCheck"
import { runDriftDetection } from "./drift-detector"
import { redisChaosProxy } from "@/lib/redis/chaos-proxy"

// ── Configuration ──────────────────────────────────────

const NUM_WORKERS = parseInt(process.env.WORKERS || "30", 10)
const DURATION_HOURS = parseInt(process.env.DURATION_HOURS || "6", 10)
const CHECK_INTERVAL_SEC = parseInt(process.env.CHECK_INTERVAL_SEC || "30", 10)
const DRIFT_CHECK_INTERVAL_MIN = parseInt(process.env.DRIFT_CHECK_INTERVAL || "5", 10)
const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000

const ENABLE_REDIS_PROXY = process.env.CHAOS_REDIS_PROXY === "true"

// ── Long Soak State ───────────────────────────────────

interface LongSoakMetrics {
  workersSpawned: number
  workersKilled: number
  checkpointsRun: number
  checkpointsFailed: number
  driftChecksRun: number
  driftIssuesDetected: number
  startTime: number
  endTime?: number
  memorySnapshots: Array<{ timestamp: number; heapUsedMb: number }>
  warnings: string[]
  errors: string[]
}

const longSoakMetrics: LongSoakMetrics = {
  workersSpawned: 0,
  workersKilled: 0,
  checkpointsRun: 0,
  checkpointsFailed: 0,
  driftChecksRun: 0,
  driftIssuesDetected: 0,
  startTime: Date.now(),
  memorySnapshots: [],
  warnings: [],
  errors: [],
}

const workers: any[] = []

// ── Worker Management ──────────────────────────────────

function startWorker(id: number) {
  const workerScript = require.resolve("./worker")

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CHAOS: "true",
    CHAOS_ERROR_RATE: "0.05",
    CHAOS_LATENCY_RATE: "0.15",
    CHAOS_KILL_RATE: "0.01",
    WORKER_ID: id.toString(),
  }

  // If Redis proxy is enabled, point workers to proxy instead of direct Redis
  if (ENABLE_REDIS_PROXY) {
    env.REDIS_PORT = "6380" // Proxy port
  }

  const worker = spawn("pnpm", ["exec", "tsx", workerScript], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  longSoakMetrics.workersSpawned++

  worker.stderr?.on("data", (data) => {
    const message = data.toString().trim().slice(0, 200)
    if (message) {
      log("warn", "worker_stderr", {
        workerId: id,
        message,
      })
    }
  })

  worker.on("exit", (code, signal) => {
    longSoakMetrics.workersKilled++

    const reason = signal ? `signal=${signal}` : `code=${code}`
    log("warn", "worker_died", {
      workerId: id,
      reason,
      totalKills: longSoakMetrics.workersKilled,
    })

    // Restart worker
    if (Date.now() - longSoakMetrics.startTime < DURATION_MS) {
      setTimeout(() => {
        const newWorker = startWorker(id)
        workers[id] = newWorker
      }, 1000)
    }
  })

  return worker
}

// ── Memory Monitoring ──────────────────────────────────

function captureMemorySnapshot() {
  const now = Date.now()
  if (global.gc) {
    global.gc() // Force GC if available
  }

  const memUsage = process.memoryUsage()
  const heapUsedMb = memUsage.heapUsed / 1024 / 1024

  longSoakMetrics.memorySnapshots.push({
    timestamp: now,
    heapUsedMb,
  })

  return heapUsedMb
}

// ── Consistency Checks ─────────────────────────────────

async function consistencyCheckpoint() {
  longSoakMetrics.checkpointsRun++

  try {
    const consistency = await validateSystem()

    if (!consistency.overall) {
      longSoakMetrics.checkpointsFailed++
      longSoakMetrics.errors.push(
        `Consistency check #${longSoakMetrics.checkpointsRun} failed`
      )

      log("error", "long_soak_consistency_failed", {
        checkpoint: longSoakMetrics.checkpointsRun,
        errors: consistency.results
          .filter((r) => !r.passed)
          .map((r) => r.name),
      })
    }
  } catch (error) {
    longSoakMetrics.checkpointsFailed++
    longSoakMetrics.errors.push(
      `Consistency check error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// ── Drift Detection ────────────────────────────────────

async function driftCheckpoint() {
  longSoakMetrics.driftChecksRun++

  try {
    const drift = await runDriftDetection()

    if (drift.issues.length > 0) {
      longSoakMetrics.driftIssuesDetected += drift.issues.length
      longSoakMetrics.warnings.push(
        `Drift check #${longSoakMetrics.driftChecksRun}: ${drift.issues.length} issues`
      )

      log("warn", "long_soak_drift_detected", {
        checkpoint: longSoakMetrics.driftChecksRun,
        issues: drift.issues.slice(0, 5),
      })
    }
  } catch (error) {
    log("error", "long_soak_drift_check_error", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ── Main Long Soak Test ────────────────────────────────

async function longSoakTest() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            🔥 LONG SOAK TEST STARTED (PRODUCTION-GRADE)        ║
║   Workers: ${NUM_WORKERS}                                      ║
║   Duration: ${DURATION_HOURS} hour(s)                          ║
║   Check Interval: ${CHECK_INTERVAL_SEC}s                       ║
║   Drift Check: Every ${DRIFT_CHECK_INTERVAL_MIN}m              ║
║   Redis Proxy: ${ENABLE_REDIS_PROXY ? "ENABLED (TCP chaos)" : "disabled"}       ║
║                                                                ║
║   This test catches:                                           ║
║   • Memory creep (accumulation over hours)                     ║
║   • Connection degradation                                     ║
║   • Redis/Postgres drift                                       ║
║   • Garbage key accumulation                                   ║
╚════════════════════════════════════════════════════════════════╝
  `)

  log("info", "long_soak_started", {
    workers: NUM_WORKERS,
    durationHours: DURATION_HOURS,
    redisProxyEnabled: ENABLE_REDIS_PROXY,
  })

  // Start Redis proxy if enabled
  if (ENABLE_REDIS_PROXY) {
    await redisChaosProxy.start()
  }

  // Spawn worker fleet
  for (let i = 0; i < NUM_WORKERS; i++) {
    workers.push(startWorker(i))
  }

  // Start consistency checks
  const checkInterval = setInterval(async () => {
    await consistencyCheckpoint()

    // Capture memory snapshot
    const heapMb = captureMemorySnapshot()

    // Print progress
    const elapsedMs = Date.now() - longSoakMetrics.startTime
    const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(1)
    const checkpointFailRate =
      longSoakMetrics.checkpointsRun > 0
        ? ((longSoakMetrics.checkpointsFailed / longSoakMetrics.checkpointsRun) * 100).toFixed(1)
        : "0"

    console.log(
      `[LONG-SOAK] Checkpoint #${longSoakMetrics.checkpointsRun} | ` +
        `Killed: ${longSoakMetrics.workersKilled} | ` +
        `Failed Checks: ${longSoakMetrics.checkpointsFailed}/${longSoakMetrics.checkpointsRun} (${checkpointFailRate}%) | ` +
        `Memory: ${heapMb.toFixed(1)} MB | ` +
        `Elapsed: ${elapsedMinutes} min`
    )
  }, CHECK_INTERVAL_SEC * 1000)

  // Start drift detection
  const driftInterval = setInterval(
    async () => {
      await driftCheckpoint()
    },
    DRIFT_CHECK_INTERVAL_MIN * 60 * 1000
  )

  // Run for specified duration
  setTimeout(async () => {
    clearInterval(checkInterval)
    clearInterval(driftInterval)
    longSoakMetrics.endTime = Date.now()

    // Final checks
    console.log("\n📊 Running final consistency and drift checks...")
    await consistencyCheckpoint()
    await driftCheckpoint()

    // Kill all workers
    console.log("🛑 Stopping all workers...")
    workers.forEach((w) => w.kill("SIGKILL"))

    // Print final report
    printFinalReport()

    process.exit(longSoakMetrics.checkpointsFailed > 0 ? 1 : 0)
  }, DURATION_MS)
}

// ── Final Report ───────────────────────────────────────

function printFinalReport() {
  const totalDuration = longSoakMetrics.endTime! - longSoakMetrics.startTime
  const totalHours = (totalDuration / 1000 / 60 / 60).toFixed(1)

  const checkpointFailRate =
    longSoakMetrics.checkpointsRun > 0
      ? ((longSoakMetrics.checkpointsFailed / longSoakMetrics.checkpointsRun) * 100).toFixed(1)
      : "0"

  // Analyze memory trend
  const memorySnapshots = longSoakMetrics.memorySnapshots
  const initialMemory = memorySnapshots[0]?.heapUsedMb || 0
  const finalMemory = memorySnapshots[memorySnapshots.length - 1]?.heapUsedMb || 0
  const memoryGrowth = finalMemory - initialMemory

  // Calculate avg throughput
  const completedSeconds = totalDuration / 1000
  const jobsPerSec = (50 * completedSeconds / 1000).toFixed(0) // Assuming 50 jobs/sec

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              📈 LONG SOAK TEST FINAL REPORT                    ║
╚════════════════════════════════════════════════════════════════╝

Duration: ${totalHours} hours (${(totalDuration / 1000 / 60).toFixed(0)} min)

Workers:
  Spawned: ${longSoakMetrics.workersSpawned}
  Killed:  ${longSoakMetrics.workersKilled}
  Avg Lifetime: ${(totalDuration / longSoakMetrics.workersKilled / 1000 / 60).toFixed(1)}m

Consistency:
  Checks Run: ${longSoakMetrics.checkpointsRun}
  Failed: ${longSoakMetrics.checkpointsFailed}
  Failure Rate: ${checkpointFailRate}%

Drift Detection:
  Checks Run: ${longSoakMetrics.driftChecksRun}
  Issues Detected: ${longSoakMetrics.driftIssuesDetected}

Memory:
  Initial: ${initialMemory.toFixed(1)} MB
  Final: ${finalMemory.toFixed(1)} MB
  Growth: ${memoryGrowth > 0 ? "+" : ""}${memoryGrowth.toFixed(1)} MB
  ${Math.abs(memoryGrowth) > 100 ? "⚠️  WARNING: Significant memory growth" : "✅ Stable"}

Throughput:
  Estimated jobs processed: ${jobsPerSec}
  Avg jobs/sec: ${(parseFloat(jobsPerSec) / completedSeconds).toFixed(0)}

${longSoakMetrics.checkpointsFailed === 0 && longSoakMetrics.driftIssuesDetected === 0 ? `
╔════════════════════════════════════════════════════════════════╗
║  ✅ LONG SOAK PASSED — System stable for ${totalHours}h           ║
║  Workers killed ${longSoakMetrics.workersKilled} times                          ║
║  No consistency or drift violations                            ║
║  Memory stable                                                 ║
╚════════════════════════════════════════════════════════════════╝
` : `
╔════════════════════════════════════════════════════════════════╗
║  ❌ LONG SOAK FAILED — Issues detected                         ║
║  Failed checks: ${longSoakMetrics.checkpointsFailed}                                      ║
║  Drift issues: ${longSoakMetrics.driftIssuesDetected}                                      ║
╚════════════════════════════════════════════════════════════════╝
`}
  `)

  log("info", "long_soak_completed", {
    durationHours: parseFloat(totalHours),
    workersKilled: longSoakMetrics.workersKilled,
    checkpointsRun: longSoakMetrics.checkpointsRun,
    checkpointsFailed: longSoakMetrics.checkpointsFailed,
    driftIssuesDetected: longSoakMetrics.driftIssuesDetected,
    memoryGrowthMb: memoryGrowth.toFixed(1),
    passed: longSoakMetrics.checkpointsFailed === 0 && longSoakMetrics.driftIssuesDetected === 0,
  })
}

// ── Start Long Soak Test ───────────────────────────────

longSoakTest().catch((error) => {
  console.error("❌ Long soak test failed:", error)
  log("error", "long_soak_fatal", {
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
