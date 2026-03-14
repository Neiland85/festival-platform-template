/**
 * Role-Based Access Control (RBAC)
 *
 * Roles:
 *   admin  — full access to all resources
 *   editor — CRUD events, view leads, view dashboard
 *   viewer — read-only dashboard, view events & leads
 *
 * Permissions are defined declaratively and checked at the route handler level.
 */

export type Role = "admin" | "editor" | "viewer"

export type Permission =
  | "events:read"
  | "events:create"
  | "events:update"
  | "events:delete"
  | "leads:read"
  | "leads:export"
  | "dashboard:read"
  | "users:manage"
  | "system:admin"

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    "events:read",
    "events:create",
    "events:update",
    "events:delete",
    "leads:read",
    "leads:export",
    "dashboard:read",
    "users:manage",
    "system:admin",
  ],
  editor: [
    "events:read",
    "events:create",
    "events:update",
    "events:delete",
    "leads:read",
    "dashboard:read",
  ],
  viewer: [
    "events:read",
    "leads:read",
    "dashboard:read",
  ],
} as const

/** Check if a role has a specific permission */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** Check if a role has ALL listed permissions */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/** Check if a role has ANY of the listed permissions */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/** Get all permissions for a role */
export function getPermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}

/** Validate that a string is a valid Role */
export function isValidRole(value: string): value is Role {
  return value === "admin" || value === "editor" || value === "viewer"
}
