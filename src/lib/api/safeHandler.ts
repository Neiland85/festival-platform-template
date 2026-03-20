/**
 * Error-boundary wrapper for API route handlers.
 *
 * Catches unhandled exceptions, logs them with structured context,
 * reports to Sentry (if available), and returns a safe 500 response
 * with the correlation requestId for debugging.
 *
 * NOTE: For full observability (latency, access logs, correlation ID
 * propagation), prefer `withObservability` which includes error handling.
 * Use `safeHandler` only for routes that don't need the full wrapper.
 */

import { NextRequest, NextResponse } from "next/server"
import { logger, getRequestContext } from "@/lib/logger"

type HandlerFn = (req: NextRequest) => Promise<NextResponse>

export function safeHandler(fn: HandlerFn): HandlerFn {
  return async (req: NextRequest) => {
    try {
      return await fn(req)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error"
      const ctx = getRequestContext()

      logger.error("unhandled_route_error", {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        route: req.nextUrl.pathname,
        method: req.method,
      })

      // Sentry reporting (optional, no-throw)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs")
        if (Sentry.isInitialized?.()) {
          Sentry.captureException(error, {
            tags: {
              route: req.nextUrl.pathname,
              method: req.method,
              requestId: ctx?.requestId,
            },
          })
        }
      } catch {
        // Sentry not available — already logged above
      }

      return NextResponse.json(
        {
          error: "internal server error",
          ...(ctx?.requestId && { requestId: ctx.requestId }),
        },
        { status: 500 },
      )
    }
  }
}
