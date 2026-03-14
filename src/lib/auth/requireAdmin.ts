import { NextRequest } from "next/server"
import { validateSession, getSessionRole } from "@/lib/auth/sessionStore"
import { hasPermission, type Permission, type Role } from "@/lib/auth/rbac"

/** Backwards-compatible: returns true if session is valid (any role) */
export function requireAdmin(req: NextRequest): boolean {
  const token = req.cookies.get("admin_session")?.value
  return validateSession(token)
}

/** Check if the session holder has a specific permission */
export function requirePermission(
  req: NextRequest,
  permission: Permission
): boolean {
  const token = req.cookies.get("admin_session")?.value
  if (!validateSession(token)) return false
  const role = getSessionRole(token)
  if (!role) return false
  return hasPermission(role, permission)
}

/** Get the role of the current session (or null) */
export function getRequestRole(req: NextRequest): Role | null {
  const token = req.cookies.get("admin_session")?.value
  if (!validateSession(token)) return null
  return getSessionRole(token)
}
