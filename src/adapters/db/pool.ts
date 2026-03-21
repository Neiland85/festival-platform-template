/**
 * PostgreSQL connection pool — hardened for Vercel Serverless + Neon.
 *
 * KEY DECISIONS:
 *
 * 1. SINGLETON via globalThis (not module-level `let`)
 *    Vercel bundles each route into its own isolate, but within the same
 *    invocation, modules may be re-imported. `globalThis.__pgPool` ensures
 *    one pool per Node process across hot reloads and re-imports.
 *
 * 2. LOW max CONNECTIONS (max: 3)
 *    Serverless = many concurrent processes. Neon free tier supports ~100
 *    connections total. If 30 Lambda instances each hold 10 connections,
 *    you hit 300 → "too many connections". 3 per instance is safe.
 *
 * 3. SHORT IDLE TIMEOUT (idleTimeoutMillis: 4_000)
 *    Serverless functions live 5-15s. A 30s idle timeout means connections
 *    outlive the function and become zombies. 4s returns them fast.
 *
 * 4. GENEROUS CONNECTION TIMEOUT (connectionTimeoutMillis: 10_000)
 *    Neon cold starts on free tier take 3-7s. 5s timeout causes intermittent
 *    failures. 10s absorbs cold starts without masking real problems.
 *
 * 5. STATEMENT TIMEOUT (statement_timeout: 25s)
 *    Prevents runaway queries from blocking the pool. Vercel functions
 *    timeout at 30s (Hobby) or 60s (Pro) — we timeout before Vercel does
 *    to get a clean error instead of an abrupt kill.
 *
 * 6. SSL: rejectUnauthorized: true (production) / false (dev remote)
 *    Neon's certs are from a public CA. In production we verify them.
 *    Local dev with remote Neon may hit self-signed cert issues,
 *    so we relax only in development + non-localhost connections.
 *
 * 7. POOL ERROR HANDLER
 *    The pool emits 'error' on idle client disconnects (Neon suspends
 *    after 5min inactivity). Without a handler, Node crashes with
 *    unhandled rejection. We log + destroy the pool so the next call
 *    creates a fresh one.
 */

import { Pool } from "pg"
import { serverEnv } from "@/lib/env"

// Survive hot reloads in dev and re-imports in serverless
const globalPool = globalThis as unknown as { __pgPool?: Pool }

/**
 * Returns a lazily-initialized pg Pool, optimized for serverless.
 *
 * Safe to call on every request — returns the cached instance.
 */
export function getPool(): Pool {
  if (!globalPool.__pgPool) {
    const connStr = serverEnv.DATABASE_URL
    const isLocal =
      connStr.includes("localhost") || connStr.includes("127.0.0.1")
    const isProd = serverEnv.NODE_ENV === "production"

    globalPool.__pgPool = new Pool({
      connectionString: connStr,

      // SSL: off for local, strict for prod, relaxed for dev+remote
      ...(isLocal
        ? {}
        : {
            ssl: { rejectUnauthorized: isProd },
          }),

      // Serverless-safe limits
      max: isLocal ? 5 : 3,
      idleTimeoutMillis: isLocal ? 30_000 : 4_000,
      connectionTimeoutMillis: 10_000,

      // Prevent runaway queries (25s < Vercel's 30s function timeout)
      options: "-c statement_timeout=25000",
    })

    globalPool.__pgPool.on("error", (err) => {
      console.error("[pool] Idle client error (Neon likely suspended):", err.message)
      // Destroy the pool so the next getPool() creates a fresh one.
      // This handles Neon's 5-min inactivity disconnect gracefully.
      globalPool.__pgPool?.end().catch(() => {})
      globalPool.__pgPool = undefined
    })
  }

  return globalPool.__pgPool
}

/**
 * Gracefully shut down the pool (for tests, graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (globalPool.__pgPool) {
    await globalPool.__pgPool.end()
    globalPool.__pgPool = undefined
  }
}
