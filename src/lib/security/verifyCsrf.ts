import { NextRequest } from "next/server"
import { verifyCsrfToken } from "@/lib/csrf"

/**
 * Validates the CSRF token from the x-csrf-token header against the session cookie.
 * Returns true if valid or if CSRF_SECRET is not configured (opt-in enforcement).
 */
export function verifyCsrf(req: NextRequest): boolean {
  const secret = process.env["CSRF_SECRET"]
  if (!secret) return true // CSRF not configured = skip (opt-in)

  const token = req.headers.get("x-csrf-token")
  const sessionId = req.cookies.get("sn_sid")?.value

  if (!token || !sessionId) return false

  return verifyCsrfToken({ secret, token, sessionId })
}
