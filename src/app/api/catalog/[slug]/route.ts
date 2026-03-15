/**
 * GET /api/catalog/[slug] — Get a single asset by slug
 */

import { NextRequest, NextResponse } from "next/server"

// TODO: Replace with DB adapter when ready
// For now, this returns a placeholder to demonstrate routing.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // In production, look up from DB:
  // const asset = await assetRepository.findBySlug(slug)

  return NextResponse.json({
    message: `Asset "${slug}" — connect a database adapter to serve real data`,
    slug,
  })
}
