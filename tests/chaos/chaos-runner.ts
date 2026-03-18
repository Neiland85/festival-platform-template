#!/usr/bin/env ts-node
/**
 * Chaos Test Runner
 *
 * Execute chaos scenarios and validate system behavior under failure conditions.
 *
 * Usage:
 *   ts-node chaos-runner.ts [--scenario <name>] [--all]
 *
 * Examples:
 *   ts-node chaos-runner.ts --scenario reconciliation_race
 *   ts-node chaos-runner.ts --all
 */

import { CHAOS_SCENARIOS } from "./chaos-scenarios"
import { validateSystemConsistency } from "./chaos-validator"
import { log } from "@/lib/logger"

// ── Test Report ────────────────────────────────────────────

interface TestRun {
  scenario: string
  startTime: number
  endTime?: number
  duration?: number
  attackError?: string
  validationPassed: boolean
  validationErrors: string[]
}

const testRuns: TestRun[] = []

// ── Test Executor ──────────────────────────────────────────

async function runChaosTest(scenarioName?: string) {
  const scenarios = scenarioName
    ? CHAOS_SCENARIOS.filter((s) => s.name === scenarioName)
    : CHAOS_SCENARIOS

  if (scenarios.length === 0) {
    console.error(`❌ Scenario not found: ${scenarioName}`)
    console.log("\nAvailable scenarios:")
    CHAOS_SCENARIOS.forEach((s) => console.log(`  - ${s.name}: ${s.description}`))
    return
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🔴 CHAOS TESTING — Distributed Queue Under Attack      ║
╚════════════════════════════════════════════════════════════════╝

Running ${scenarios.length} scenario(s)...
`)

  for (const scenario of scenarios) {
    const run: TestRun = {
      scenario: scenario.name,
      startTime: Date.now(),
      validationPassed: false,
      validationErrors: [],
    }

    try {
      console.log(`\n📍 Scenario: ${scenario.name}`)
      console.log(`   Description: ${scenario.description}`)
      console.log(`   Status: ATTACKING...`)

      // Run attack
      await scenario.attack()

      // Run validation
      const validation = await scenario.validate()

      run.validationPassed = validation.passed
      run.endTime = Date.now()
      run.duration = run.endTime - run.startTime

      if (validation.passed) {
        console.log(`   ✅ PASSED (${run.duration}ms)`)
        console.log(`      Reason: ${validation.reason || "No issues detected"}`)
      } else {
        console.log(`   ❌ FAILED (${run.duration}ms)`)
        console.log(`      Reason: ${validation.reason}`)
        run.validationErrors.push(validation.reason || "Unknown error")
      }
    } catch (error) {
      run.endTime = Date.now()
      run.duration = run.endTime - run.startTime
      run.attackError = error instanceof Error ? error.message : String(error)
      console.log(`   ⚠️  ATTACK ERROR (${run.duration}ms)`)
      console.log(`      Error: ${run.attackError}`)
    }

    testRuns.push(run)
  }

  // System consistency check at the end
  console.log(`\n📊 Final Consistency Check...`)
  const consistency = await validateSystemConsistency()
  console.log(consistency.summary)

  // Print report
  printReport(consistency.overall)
}

// ── Report Printer ────────────────────────────────────────────

function printReport(systemConsistent: boolean) {
  const passed = testRuns.filter((r) => r.validationPassed).length
  const failed = testRuns.filter((r) => !r.validationPassed).length
  const errors = testRuns.filter((r) => r.attackError).length
  const totalDuration = testRuns.reduce((sum, r) => sum + (r.duration || 0), 0)

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      📈 TEST REPORT                            ║
╚════════════════════════════════════════════════════════════════╝

Total Tests: ${testRuns.length}
✅ Passed:   ${passed}
❌ Failed:   ${failed}
⚠️  Errors:   ${errors}

Total Duration: ${totalDuration}ms
System Consistent: ${systemConsistent ? "✅ YES" : "❌ NO"}

${failed > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILED SCENARIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${testRuns
  .filter((r) => !r.validationPassed)
  .map((r) => `  ❌ ${r.scenario} — ${r.validationErrors.join(" | ")}`)
  .join("\n")}
` : ""}

${errors > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATTACK ERRORS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${testRuns
  .filter((r) => r.attackError)
  .map((r) => `  ⚠️  ${r.scenario} — ${r.attackError}`)
  .join("\n")}
` : ""}

${
  passed === testRuns.length && systemConsistent
    ? `
╔════════════════════════════════════════════════════════════════╗
║  🎉 ALL TESTS PASSED — SYSTEM RESILIENT TO CHAOS ATTACKS       ║
╚════════════════════════════════════════════════════════════════╝
`
    : `
╔════════════════════════════════════════════════════════════════╗
║  🚨 SYSTEM FAILED UNDER CHAOS — FIXES REQUIRED                 ║
╚════════════════════════════════════════════════════════════════╝
`
}
`)

  process.exit(systemConsistent && failed === 0 ? 0 : 1)
}

// ── CLI Parsing ────────────────────────────────────────────────

const args = process.argv.slice(2)
const scenarioFlag = args.indexOf("--scenario")
const scenario = scenarioFlag !== -1 ? args[scenarioFlag + 1] : undefined
const runAll = args.includes("--all")

if (!scenario && !runAll) {
  console.log(`
Usage: ts-node chaos-runner.ts [--scenario <name>] [--all]

Available scenarios:
${CHAOS_SCENARIOS.map((s) => `  • ${s.name}: ${s.description}`).join("\n")}

Examples:
  ts-node chaos-runner.ts --scenario reconciliation_race
  ts-node chaos-runner.ts --all
`)
  process.exit(0)
}

// Run tests
runChaosTest(scenario).catch((error) => {
  console.error("❌ Chaos runner failed:", error)
  process.exit(1)
})
