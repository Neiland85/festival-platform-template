/**
 * GET  /api/catalog       — List all assets
 * POST /api/catalog       — Create a new asset (admin)
 */

import { NextRequest, NextResponse } from "next/server"
import { createAssetSchema } from "@/contracts/schemas/asset.schema"
import type { Asset } from "@/domain/assets/types"

// In-memory catalog store (replace with DB adapter later)
const catalog: Asset[] = []

export function GET() {
  return NextResponse.json({
    assets: catalog,
    total: catalog.length,
  })
}

export async function POST(req: NextRequest) {
  // ── Preview/CI guard ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ disabled: true, message: "Disabled in preview" })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { createAsset } = await import("@/domain/assets/create-asset")

  try {
    const body = await req.json()
    const parsed = createAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const asset = createAsset(parsed.data)
    catalog.push(asset)

    return NextResponse.json(asset, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
