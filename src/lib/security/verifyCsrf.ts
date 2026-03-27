import { NextRequest } from "next/server"
import { verifyCsrfToken } from "@/lib/csrf"
import { serverEnv } from "@/lib/env"

/**
 * Validates the CSRF token from the x-csrf-token header against the session cookie.
 *
 * SECURITY: In production, CSRF_SECRET must be configured. If missing,
 * the check FAILS (deny by default). In development, it logs a warning
 * and allows the request to proceed for DX convenience.
 */
export function verifyCsrf(req: NextRequest): boolean {
  const secret = serverEnv.CSRF_SECRET

  if (!secret) {
    const isProd = process.env["NODE_ENV"] === "production"

    if (isProd) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "csrf_secret_missing",
          message:
            "CSRF_SECRET is not configured in production — all mutation requests will be rejected",
        }),
      )
      return false // DENY by default in production
    }

    // Development: warn but allow (opt-in)
    console.warn("[security] CSRF_SECRET not configured — CSRF checks disabled in development")
    return true
  }

  const token = req.headers.get("x-csrf-token")
  const sessionId = req.cookies.get("sn_sid")?.value

  if (!token || !sessionId) return false

  return verifyCsrfToken({ secret, token, sessionId })
}
