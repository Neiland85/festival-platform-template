/**
 * GET /api/docs — OpenAPI 3.1 JSON specification.
 *
 * Auto-generated from Zod schemas. Can be consumed by Swagger UI,
 * Scalar, Postman, or any OpenAPI-compatible tool.
 */

import { NextResponse } from "next/server"
import { generateOpenApiSpec } from "@/lib/openapi/spec"

export function GET() {
  const spec = generateOpenApiSpec()

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
