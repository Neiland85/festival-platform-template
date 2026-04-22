import { NextRequest } from "next/server"
import { validateSessionAsync, getSessionRole } from "@/lib/auth/sessionStore"
import { hasPermission, type Permission, type Role } from "@/lib/auth/rbac"

/**
 * Validates admin session with full cryptographic verification.
 *
 * Checks (via validateSessionAsync):
 * 1. HMAC-SHA256 signature verification (constant-time via WebCrypto)
 * 2. Token expiration + anti-replay window
 * 3. Redis revocation list (if Redis available)
 * 4. Redis session lookup for cross-instance portability
 * 5. Local cache as fast path
 */
export async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_session")?.value
  return validateSessionAsync(token)
}

/** Check if the session holder has a specific permission */
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<boolean> {
  const token = req.cookies.get("admin_session")?.value
  if (!(await validateSessionAsync(token))) return false
  const role = getSessionRole(token)
  if (!role) return false
  return hasPermission(role, permission)
}

/** Get the role of the current session (or null) */
export async function getRequestRole(req: NextRequest): Promise<Role | null> {
  const token = req.cookies.get("admin_session")?.value
  if (!(await validateSessionAsync(token))) return null
  return getSessionRole(token)
}
