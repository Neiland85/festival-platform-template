/**
 * Structured JSON logger with correlation ID propagation.
 *
 * DESIGN:
 * 1. Every log line is a single JSON object → machine-parseable by Datadog,
 *    Loki, CloudWatch, Vercel Logs, etc.
 * 2. AsyncLocalStorage carries request-scoped context (requestId, method,
 *    path, userAgent) without threading it through every call site.
 * 3. Backward-compatible: `log("info", "msg", data)` still works for all
 *    14+ existing call sites. No migration needed.
 * 4. Sentry breadcrumb integration: when Sentry is loaded, every log()
 *    call also registers a breadcrumb for richer error context.
 * 5. Level routing: warn/error → stderr, info/debug → stdout.
 *
 * USAGE:
 *   // Fire-and-forget (existing pattern — still works)
 *   log("info", "order_completed", { orderId })
 *
 *   // With request context (set once in middleware)
 *   import { runWithRequestContext } from "@/lib/logger"
 *   runWithRequestContext({ requestId, method, path }, () => handler(req))
 *
 *   // Child logger with extra static fields
 *   const stripeLog = logger.child({ service: "stripe" })
 *   stripeLog.info("webhook_received", { eventId })
 */

import { AsyncLocalStorage } from "node:async_hooks"

// ── Types ────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"

export interface RequestContext {
  /** UUID v4 correlation ID propagated via x-request-id header */
  requestId: string
  method?: string
  path?: string
  userAgent?: string
  /** Authenticated user/role if available */
  userId?: string
}

interface LogEntry {
  level: LogLevel
  msg: string
  timestamp: string
  requestId?: string
  method?: string
  path?: string
  /** Duration in ms (set by middleware on response) */
  durationMs?: number
  /** HTTP status code (set by middleware on response) */
  status?: number
  /** Extra structured data */
  data?: unknown
  /** Static fields from child logger */
  [key: string]: unknown
}

// ── Numeric severity (for log aggregators that filter by number) ──

const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
}

// ── AsyncLocalStorage for request-scoped context ─────

const requestStore = new AsyncLocalStorage<RequestContext>()

/**
 * Run a callback with request-scoped context.
 * All `log()` calls inside the callback will automatically include
 * requestId, method, path, userAgent — zero manual threading.
 */
export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => T,
): T {
  return requestStore.run(ctx, fn)
}

/** Read current request context (if any) */
export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore()
}

// ── Core emit ────────────────────────────────────────

function emit(level: LogLevel, msg: string, extra?: Record<string, unknown>): void {
  const ctx = requestStore.getStore()
  const now = new Date()

  const entry: LogEntry = {
    level,
    severity: SEVERITY[level],
    msg,
    timestamp: now.toISOString(),
    // Spread request context (if running inside runWithRequestContext)
    ...(ctx && {
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
    }),
    // Spread caller-provided extra fields
    ...extra,
  }

  // Remove undefined values for clean JSON
  const clean = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined),
  )

  const line = JSON.stringify(clean)

  // Route to correct stream: warn+ → stderr, info/debug → stdout
  if (SEVERITY[level] >= SEVERITY.warn) {
    process.stderr.write(line + "\n")
  } else {
    process.stdout.write(line + "\n")
  }

  // ── Sentry breadcrumb (optional, no-throw) ──
  try {
    // Dynamic import avoidance: we try to require at call time.
    // If @sentry/nextjs isn't installed or not initialized, this is a no-op.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs")
    if (Sentry.isInitialized?.()) {
      const sentryLevel = (
        { debug: "debug", info: "info", warn: "warning", error: "error", fatal: "fatal" } as const
      )[level]
      Sentry.addBreadcrumb({
        category: "log",
        message: msg,
        level: sentryLevel,
        data: extra,
        timestamp: now.getTime() / 1000,
      })
    }
  } catch {
    // Sentry not available — silent no-op
  }
}

// ── Public API (backward-compatible) ─────────────────

/**
 * Backward-compatible log function.
 *
 *   log("info", "order_completed", { orderId: "123" })
 *
 * Existing 14+ call sites work without changes.
 * The `data` param is nested under a `data` key in the JSON output
 * to avoid key collisions with top-level fields.
 */
export function log(level: string, message: string, data?: unknown): void {
  const lvl = (["debug", "info", "warn", "error", "fatal"].includes(level)
    ? level
    : "info") as LogLevel

  emit(lvl, message, data != null ? { data } : undefined)
}

// ── Typed convenience methods ────────────────────────

export const logger = {
  debug: (msg: string, extra?: Record<string, unknown>) => emit("debug", msg, extra),
  info: (msg: string, extra?: Record<string, unknown>) => emit("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emit("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emit("error", msg, extra),
  fatal: (msg: string, extra?: Record<string, unknown>) => emit("fatal", msg, extra),

  /**
   * Create a child logger with static fields baked in.
   *
   *   const stripe = logger.child({ service: "stripe" })
   *   stripe.info("webhook_ok", { eventId })
   *   // → { ..., service: "stripe", eventId: "evt_xxx" }
   */
  child: (fields: Record<string, unknown>) => ({
    debug: (msg: string, extra?: Record<string, unknown>) =>
      emit("debug", msg, { ...fields, ...extra }),
    info: (msg: string, extra?: Record<string, unknown>) =>
      emit("info", msg, { ...fields, ...extra }),
    warn: (msg: string, extra?: Record<string, unknown>) =>
      emit("warn", msg, { ...fields, ...extra }),
    error: (msg: string, extra?: Record<string, unknown>) =>
      emit("error", msg, { ...fields, ...extra }),
    fatal: (msg: string, extra?: Record<string, unknown>) =>
      emit("fatal", msg, { ...fields, ...extra }),
  }),
}
