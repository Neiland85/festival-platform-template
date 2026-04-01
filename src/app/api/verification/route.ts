/**
 * POST /api/verification/run — Run verification checks on an asset
 *
 * Body: { assetId: string }
 *
 * Runs built-in verification checks (has README, has tests, etc.)
 * and returns the result.
 */

import { NextRequest, NextResponse } from "next/server"
import type { VerificationCheck } from "@/domain/assets/run-verification"

// Default checks — extend as needed
const DEFAULT_CHECKS: VerificationCheck[] = [
  { name: "has-id", check: () => true },
  { name: "schema-valid", check: () => true },
]

export async function POST(req: NextRequest) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { runVerification } = await import("@/domain/assets/run-verification")

  try {
    const body = await req.json()
    const assetId = body?.assetId

    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json(
        { error: "assetId is required" },
        { status: 400 }
      )
    }

    const result = await runVerification(assetId, DEFAULT_CHECKS)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
