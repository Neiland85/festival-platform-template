/**
 * API route wrapper that adds observability to every request:
 *
 * 1. Extracts or generates x-request-id (correlation ID)
 * 2. Measures latency (high-resolution)
 * 3. Runs the handler inside AsyncLocalStorage context
 *    → all log() calls automatically include requestId, method, path
 * 4. Emits a structured access log on response
 * 5. Propagates requestId to Sentry scope (if initialized)
 * 6. Returns x-request-id in response headers
 *
 * USAGE:
 *   // src/app/api/checkout/route.ts
 *   import { withObservability } from "@/lib/api/withObservability"
 *
 *   async function handler(req: NextRequest): Promise<NextResponse> {
 *     // ... your logic
 *   }
 *
 *   export const POST = withObservability(handler)
 */

import { NextRequest, NextResponse } from "next/server"
import { logger, runWithRequestContext } from "@/lib/logger"
import type { RequestContext } from "@/lib/logger"

type HandlerFn = (req: NextRequest) => Promise<NextResponse>

export function withObservability(handler: HandlerFn): HandlerFn {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = performance.now()

    // ── Correlation ID: prefer incoming header, fallback to new UUID ──
    const requestId =
      req.headers.get("x-request-id") ?? crypto.randomUUID()

    const ctx: RequestContext = {
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") ?? undefined,
    }

    // ── Sentry scope enrichment (optional, no-throw) ──
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs")
      if (Sentry.isInitialized?.()) {
        Sentry.setTag("requestId", requestId)
        Sentry.setContext("request", {
          method: ctx.method,
          path: ctx.path,
          userAgent: ctx.userAgent,
        })
      }
    } catch {
      // Sentry not available
    }

    // ── Run handler inside request context ──
    let response: NextResponse
    let status: number
    let error: unknown

    try {
      response = await runWithRequestContext(ctx, () => handler(req))
      status = response.status
    } catch (err) {
      error = err
      status = 500
      const message = err instanceof Error ? err.message : "unknown"

      logger.error("unhandled_api_error", {
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      })

      // Report to Sentry
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs")
        if (Sentry.isInitialized?.()) {
          Sentry.captureException(err)
        }
      } catch {
        // Sentry not available
      }

      response = NextResponse.json(
        { error: "internal server error", requestId },
        { status: 500 },
      )
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100

    // ── Structured access log ──
    const logLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info"
    logger[logLevel]("http_request", {
      status,
      durationMs,
      contentLength: response.headers.get("content-length") ?? undefined,
      ...(error ? { error: String(error) } : {}),
    })

    // ── Propagate headers ──
    response.headers.set("x-request-id", requestId)
    response.headers.set("server-timing", `total;dur=${durationMs}`)

    return response
  }
}
