/**
 * Next.js Middleware — centralized auth for /api/admin/* routes.
 *
 * Runs in Edge Runtime on every matching request BEFORE the route handler.
 * Ensures no admin endpoint can be accessed without a valid session cookie.
 *
 * Individual routes can still use requireAdmin() for RBAC granularity,
 * but this middleware provides the security floor — no route is accidentally unprotected.
 */

import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth/sessionStore"

export function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value

  if (!validateSession(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  // Only protect admin API routes — everything else is public
  matcher: ["/api/admin/:path*"],
}
