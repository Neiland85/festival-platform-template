import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

type HandlerFn = (req: NextRequest) => Promise<NextResponse>

export function safeHandler(fn: HandlerFn): HandlerFn {
  return async (req: NextRequest) => {
    try {
      return await fn(req)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error"
      console.error(`[API Error] ${req.nextUrl.pathname}: ${message}`)

      Sentry.captureException(error, {
        tags: { route: req.nextUrl.pathname, method: req.method },
      })

      return NextResponse.json(
        { error: "internal server error" },
        { status: 500 }
      )
    }
  }
}
