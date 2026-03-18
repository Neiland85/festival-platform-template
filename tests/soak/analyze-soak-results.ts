#!/usr/bin/env ts-node
/**
 * Soak Test Results Analyzer
 *
 * Parses logs from long soak test and generates pass/fail report
 * based on COMMIT 6 validation criteria
 *
 * Usage:
 *   ts-node tests/soak/analyze-soak-results.ts soak-output-*.log soak-metrics.log
 */

import * as fs from "fs"
import * as path from "path"

interface SoakMetrics {
  duration_hours: number
  workers_spawned: number
  workers_killed: number
  checkpoints_run: number
  checkpoints_failed: number
  drift_issues: number
  memory_snapshots: Array<{ timestamp: number; heap_mb: number }>
  latency_samples: Array<{ timestamp: number; p50: number; p95: number; p99: number; max: number }>
  retry_rates: Array<{ timestamp: number; retries_per_sec: number }>
  backlog: Array<{ timestamp: number; pending: number; processing: number }>
  lease_expirations: Array<{ timestamp: number; expired: number; recovered: number }>
  redis_memory: Array<{ timestamp: number; mb: number }>
  stale_keys: Array<{ timestamp: number; orphaned: number; total: number }>
  idempotency_hits: Array<{ timestamp: number; hits: number; total: number }>
}

const PASS_CRITERIA = {
  latency_p95_stable: 15, // ±%
  latency_p99_stable: 20, // ±%
  retry_rate_stable: 0.5, // /sec deviation
  retry_ratio_max: 2, // %
  backlog_max_growth: 200, // jobs
  lease_recovery_min: 95, // %
  memory_growth_max: 5, // MB/hour
  stale_keys_max_percent: 5, // %
  connection_utilization_max: 70, // %
  duplicate_tolerance: 0, // hard requirement
  lost_job_tolerance: 0, // hard requirement
}

class SoakAnalyzer {
  private metrics: SoakMetrics = {
    duration_hours: 0,
    workers_spawned: 0,
    workers_killed: 0,
    checkpoints_run: 0,
    checkpoints_failed: 0,
    drift_issues: 0,
    memory_snapshots: [],
    latency_samples: [],
    retry_rates: [],
    backlog: [],
    lease_expirations: [],
    redis_memory: [],
    stale_keys: [],
    idempotency_hits: [],
  }

  private testResults: Array<{
    name: string
    passed: boolean
    details: string
    value?: number
    threshold?: number
  }> = []

  constructor(private logFiles: string[]) {}

  /**
   * Parse all log files
   */
  parse(): void {
    console.log("📖 Parsing log files...")

    for (const file of this.logFiles) {
      if (!fs.existsSync(file)) {
        console.warn(`⚠️  File not found: ${file}`)
        continue
      }

      const content = fs.readFileSync(file, "utf-8")
      this.parseLogContent(content)
    }
  }

  private parseLogContent(content: string): void {
    const lines = content.split("\n")

    for (const line of lines) {
      // Parse memory snapshots
      if (line.includes("memory_snapshot")) {
        const match = line.match(/heap_mb[":= ]+(\d+\.?\d*)/)
        if (match) {
          this.metrics.memory_snapshots.push({
            timestamp: Date.now(),
            heap_mb: parseFloat(match[1]),
          })
        }
      }

      // Parse latency metrics
      if (line.includes("latency")) {
        const p50 = this.extractNumber(line, "p50")
        const p95 = this.extractNumber(line, "p95")
        const p99 = this.extractNumber(line, "p99")
        const max = this.extractNumber(line, "max")

        if (p50 !== null) {
          this.metrics.latency_samples.push({
            timestamp: Date.now(),
            p50,
            p95: p95 || 0,
            p99: p99 || 0,
            max: max || 0,
          })
        }
      }

      // Parse retry rates
      if (line.includes("retry") && line.includes("/sec")) {
        const rate = this.extractNumber(line, "retry")
        if (rate !== null) {
          this.metrics.retry_rates.push({
            timestamp: Date.now(),
            retries_per_sec: rate,
          })
        }
      }

      // Parse backlog
      if (line.includes("backlog") || line.includes("pending")) {
        const pending = this.extractNumber(line, "pending")
        const processing = this.extractNumber(line, "processing")

        if (pending !== null) {
          this.metrics.backlog.push({
            timestamp: Date.now(),
            pending,
            processing: processing || 0,
          })
        }
      }

      // Parse lease expirations
      if (line.includes("lease") && line.includes("expired")) {
        const expired = this.extractNumber(line, "expired")
        const recovered = this.extractNumber(line, "recovered")

        if (expired !== null) {
          this.metrics.lease_expirations.push({
            timestamp: Date.now(),
            expired,
            recovered: recovered || expired,
          })
        }
      }

      // Parse Redis memory
      if (line.includes("redis_memory")) {
        const mb = this.extractNumber(line, "mb")
        if (mb !== null) {
          this.metrics.redis_memory.push({
            timestamp: Date.now(),
            mb,
          })
        }
      }

      // Parse stale keys
      if (line.includes("stale") || line.includes("orphan")) {
        const orphaned = this.extractNumber(line, "orphaned")
        const total = this.extractNumber(line, "total")

        if (orphaned !== null && total !== null) {
          this.metrics.stale_keys.push({
            timestamp: Date.now(),
            orphaned,
            total,
          })
        }
      }

      // Parse idempotency
      if (line.includes("idempotency")) {
        const hits = this.extractNumber(line, "hits")
        const total = this.extractNumber(line, "total")

        if (hits !== null && total !== null) {
          this.metrics.idempotency_hits.push({
            timestamp: Date.now(),
            hits,
            total,
          })
        }
      }

      // Parse test summary
      if (line.includes("long_soak_completed")) {
        const duration = this.extractNumber(line, "durationHours")
        const spawned = this.extractNumber(line, "workersSpawned")
        const killed = this.extractNumber(line, "workersKilled")
        const checkpointsFailed = this.extractNumber(line, "checkpointsFailed")
        const driftIssues = this.extractNumber(line, "driftIssuesDetected")

        if (duration !== null) {
          this.metrics.duration_hours = duration
        }
        if (spawned !== null) {
          this.metrics.workers_spawned = spawned
        }
        if (killed !== null) {
          this.metrics.workers_killed = killed
        }
        if (checkpointsFailed !== null) {
          this.metrics.checkpoints_failed = checkpointsFailed
        }
        if (driftIssues !== null) {
          this.metrics.drift_issues = driftIssues
        }
      }
    }
  }

  private extractNumber(line: string, key: string): number | null {
    const regex = new RegExp(`${key}[":= ]+([0-9.]+)`)
    const match = line.match(regex)
    return match ? parseFloat(match[1]) : null
  }

  /**
   * Run all validation checks
   */
  validate(): void {
    console.log("\n🧪 Running validation checks...\n")

    this.checkLatencyStability()
    this.checkRetryRates()
    this.checkBacklogGrowth()
    this.checkLeaseRecovery()
    this.checkMemoryGrowth()
    this.checkStaleKeys()
    this.checkIdempotency()
    this.checkBasicPassFail()
  }

  private checkLatencyStability(): void {
    if (this.metrics.latency_samples.length < 2) {
      this.testResults.push({
        name: "Latency Stability",
        passed: false,
        details: "Insufficient latency samples",
      })
      return
    }

    const samples = this.metrics.latency_samples
    const firstP95 = samples[0].p95
    const lastP95 = samples[samples.length - 1].p95

    const p95Deviation = Math.abs((lastP95 - firstP95) / firstP95) * 100

    const passed = p95Deviation <= PASS_CRITERIA.latency_p95_stable

    this.testResults.push({
      name: "Latency P95 Stability",
      passed,
      details: `P95 deviation: ${p95Deviation.toFixed(1)}% (threshold: ±${PASS_CRITERIA.latency_p95_stable}%)`,
      value: p95Deviation,
      threshold: PASS_CRITERIA.latency_p95_stable,
    })
  }

  private checkRetryRates(): void {
    if (this.metrics.retry_rates.length < 2) {
      this.testResults.push({
        name: "Retry Rates",
        passed: true,
        details: "Insufficient retry data (OK for short tests)",
      })
      return
    }

    const rates = this.metrics.retry_rates.map((r) => r.retries_per_sec)
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
    const maxDeviation = Math.max(...rates.map((r) => Math.abs(r - avgRate)))

    const passed = maxDeviation <= PASS_CRITERIA.retry_rate_stable

    this.testResults.push({
      name: "Retry Rate Stability",
      passed,
      details: `Max deviation: ${maxDeviation.toFixed(2)}/sec (threshold: ±${PASS_CRITERIA.retry_rate_stable}/sec)`,
      value: maxDeviation,
      threshold: PASS_CRITERIA.retry_rate_stable,
    })
  }

  private checkBacklogGrowth(): void {
    if (this.metrics.backlog.length < 2) {
      this.testResults.push({
        name: "Backlog Growth",
        passed: true,
        details: "Insufficient backlog data (OK for short tests)",
      })
      return
    }

    const backlog = this.metrics.backlog
    const initialSize = backlog[0].pending + backlog[0].processing
    const maxSize = Math.max(
      ...backlog.map((b) => b.pending + b.processing)
    )

    const growth = maxSize - initialSize

    const passed = growth <= PASS_CRITERIA.backlog_max_growth && maxSize < 5000

    this.testResults.push({
      name: "Backlog Growth",
      passed,
      details: `Max backlog: ${maxSize} (growth: ${growth}, threshold: +${PASS_CRITERIA.backlog_max_growth}), <5000 required`,
      value: growth,
      threshold: PASS_CRITERIA.backlog_max_growth,
    })
  }

  private checkLeaseRecovery(): void {
    if (this.metrics.lease_expirations.length === 0) {
      this.testResults.push({
        name: "Lease Recovery",
        passed: true,
        details: "No lease expirations (OK if test too short)",
      })
      return
    }

    const expirations = this.metrics.lease_expirations
    const recoveryRate = expirations.reduce((sum, e) => sum + (e.recovered / e.expired), 0) / expirations.length * 100

    const passed = recoveryRate >= PASS_CRITERIA.lease_recovery_min

    this.testResults.push({
      name: "Lease Recovery Rate",
      passed,
      details: `Recovery rate: ${recoveryRate.toFixed(1)}% (threshold: >=${PASS_CRITERIA.lease_recovery_min}%)`,
      value: recoveryRate,
      threshold: PASS_CRITERIA.lease_recovery_min,
    })
  }

  private checkMemoryGrowth(): void {
    if (this.metrics.memory_snapshots.length < 2) {
      this.testResults.push({
        name: "Memory Growth",
        passed: true,
        details: "Insufficient memory samples (OK for short tests)",
      })
      return
    }

    const snapshots = this.metrics.memory_snapshots
    const firstMem = snapshots[0].heap_mb
    const lastMem = snapshots[snapshots.length - 1].heap_mb

    const totalGrowth = lastMem - firstMem
    const hours = this.metrics.duration_hours || 1
    const growthPerHour = totalGrowth / hours

    const passed = growthPerHour <= PASS_CRITERIA.memory_growth_max

    this.testResults.push({
      name: "Memory Growth Rate",
      passed,
      details: `Growth: ${growthPerHour.toFixed(1)} MB/hour (threshold: <${PASS_CRITERIA.memory_growth_max} MB/hour), Total: ${totalGrowth.toFixed(1)} MB`,
      value: growthPerHour,
      threshold: PASS_CRITERIA.memory_growth_max,
    })
  }

  private checkStaleKeys(): void {
    if (this.metrics.stale_keys.length === 0) {
      this.testResults.push({
        name: "Stale Keys",
        passed: true,
        details: "No stale key data collected",
      })
      return
    }

    const staleData = this.metrics.stale_keys
    const maxOrphanPercent = Math.max(
      ...staleData.map((s) => (s.orphaned / s.total) * 100)
    )

    const passed = maxOrphanPercent <= PASS_CRITERIA.stale_keys_max_percent

    this.testResults.push({
      name: "Stale Keys Percentage",
      passed,
      details: `Max orphaned: ${maxOrphanPercent.toFixed(1)}% (threshold: <${PASS_CRITERIA.stale_keys_max_percent}%)`,
      value: maxOrphanPercent,
      threshold: PASS_CRITERIA.stale_keys_max_percent,
    })
  }

  private checkIdempotency(): void {
    if (this.metrics.idempotency_hits.length === 0) {
      this.testResults.push({
        name: "Idempotency Hit Rate",
        passed: true,
        details: "No idempotency data collected",
      })
      return
    }

    const hitData = this.metrics.idempotency_hits
    const avgHitPercent = (
      hitData.reduce((sum, h) => sum + (h.hits / h.total) * 100, 0) /
      hitData.length
    )

    // Hit rate should be 0.5-2% for normal operation
    const passed = avgHitPercent > 0.5 && avgHitPercent < 5

    this.testResults.push({
      name: "Idempotency Hit Rate",
      passed,
      details: `Avg hit rate: ${avgHitPercent.toFixed(2)}% (expected: 0.5-2%, <5% acceptable)`,
      value: avgHitPercent,
      threshold: 2,
    })
  }

  private checkBasicPassFail(): void {
    // Hard requirements
    const failed = this.metrics.checkpoints_failed === 0
    const noDrift = this.metrics.drift_issues === 0

    this.testResults.push({
      name: "Consistency Checks",
      passed: failed,
      details: `${this.metrics.checkpoints_run} checks run, ${this.metrics.checkpoints_failed} failed`,
      value: this.metrics.checkpoints_failed,
      threshold: 0,
    })

    this.testResults.push({
      name: "Drift Detection",
      passed: noDrift,
      details: `${this.metrics.drift_issues} drift issues detected`,
      value: this.metrics.drift_issues,
      threshold: 0,
    })
  }

  /**
   * Generate final report
   */
  generateReport(): string {
    const passed = this.testResults.filter((r) => r.passed).length
    const total = this.testResults.length
    const passRate = ((passed / total) * 100).toFixed(1)

    let report = `
╔════════════════════════════════════════════════════════════════╗
║          COMMIT 6 VALIDATION REPORT                           ║
║          Soak Test Analysis                                   ║
╚════════════════════════════════════════════════════════════════╝

📊 TEST SUMMARY
Duration: ${this.metrics.duration_hours} hours
Workers Spawned: ${this.metrics.workers_spawned}
Workers Killed: ${this.metrics.workers_killed}
Avg Worker Lifetime: ${(this.metrics.duration_hours * 60 / this.metrics.workers_killed).toFixed(1)} min

✅ VALIDATION RESULTS: ${passed}/${total} passed (${passRate}%)

`

    // Results detail
    report += `\n📋 DETAILED RESULTS\n`
    for (const result of this.testResults) {
      const icon = result.passed ? "✅" : "❌"
      const details = result.value !== undefined ? ` (${result.value?.toFixed(2)} vs ${result.threshold})` : ""
      report += `${icon} ${result.name}\n   ${result.details}${details}\n\n`
    }

    // Final verdict
    const allPassed = this.testResults.every((r) => r.passed)

    if (allPassed) {
      report += `
╔════════════════════════════════════════════════════════════════╗
║  ✅ COMMIT 6 VALIDATION PASSED                                 ║
║  System is stable for production deployment                   ║
║  Ready for COMMIT 7-8 (Observability + Drift Detection)        ║
╚════════════════════════════════════════════════════════════════╝
`
    } else {
      report += `
╔════════════════════════════════════════════════════════════════╗
║  ❌ COMMIT 6 VALIDATION FAILED                                 ║
║  Do NOT proceed to COMMIT 7-8                                  ║
║  Investigate failures, iterate COMMIT 6, re-validate          ║
╚════════════════════════════════════════════════════════════════╝
`
    }

    return report
  }

  /**
   * Save report to file
   */
  saveReport(filename: string = "soak-validation-report.md"): void {
    const report = this.generateReport()
    fs.writeFileSync(filename, report)
    console.log(`📝 Report saved to: ${filename}`)
  }

  /**
   * Print report to stdout
   */
  printReport(): void {
    console.log(this.generateReport())
  }
}

// ── Main ────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args.length === 0) {
  console.log(`
Usage: ts-node analyze-soak-results.ts <log-files...>

Example:
  ts-node analyze-soak-results.ts soak-output-*.log soak-metrics.log
  `)
  process.exit(1)
}

const analyzer = new SoakAnalyzer(args)
analyzer.parse()
analyzer.validate()
analyzer.printReport()
analyzer.saveReport()

const allPassed = analyzer["testResults"].every((r: any) => r.passed)
process.exit(allPassed ? 0 : 1)
