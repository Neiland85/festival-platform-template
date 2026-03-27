/**
 * Tenant Context — AsyncLocalStorage for multi-tenant request isolation.
 *
 * Propagates the tenant schema name through the async request chain.
 * All database queries automatically use the correct schema via SET search_path.
 *
 * Default: "public" schema (backward compatible with single-tenant deployments).
 */

import { AsyncLocalStorage } from "node:async_hooks"

export type TenantContext = {
  tenantId: string
  slug: string
  schemaName: string
}

const tenantStorage = new AsyncLocalStorage<TenantContext>()

const DEFAULT_CONTEXT: TenantContext = {
  tenantId: "default",
  slug: "default",
  schemaName: "public",
}

/**
 * Run a function within a tenant context.
 * All database queries within the callback will use the tenant's schema.
 */
export function runWithTenant<T>(tenant: TenantContext, fn: () => T): T {
  return tenantStorage.run(tenant, fn)
}

/**
 * Get the current tenant context (or default "public" schema).
 */
export function getCurrentTenant(): TenantContext {
  return tenantStorage.getStore() ?? DEFAULT_CONTEXT
}

/**
 * Get just the schema name for SQL SET search_path.
 */
export function getCurrentSchema(): string {
  return getCurrentTenant().schemaName
}
