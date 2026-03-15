import type { Verification } from "./types"

export type VerificationCheck = {
  name: string
  check: () => boolean | Promise<boolean>
}

/**
 * Runs a series of verification checks against an asset.
 * Returns a Verification result with pass/fail counts.
 */
export async function runVerification(
  assetId: string,
  checks: VerificationCheck[]
): Promise<Verification> {
  const errors: string[] = []
  let passed = 0

  for (const { name, check } of checks) {
    try {
      const result = await check()
      if (result) {
        passed++
      } else {
        errors.push(`Check "${name}" failed`)
      }
    } catch (err) {
      errors.push(
        `Check "${name}" threw: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return {
    id: crypto.randomUUID(),
    status: errors.length === 0 ? "passed" : "failed",
    lastRunAt: new Date().toISOString(),
    passed,
    total: checks.length,
    errors,
  }
}
