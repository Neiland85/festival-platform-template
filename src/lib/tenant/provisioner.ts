/**
 * Tenant Provisioner — creates isolated PostgreSQL schemas for new tenants.
 *
 * Each tenant gets its own schema with the full table structure.
 * Schema naming: "tenant_" + sanitized slug (e.g., "tenant_acme_corp").
 *
 * Uses raw pg for DDL operations (CREATE SCHEMA is not supported by Drizzle).
 */

import { getPool } from "@/adapters/db/pool"
import { getDb } from "@/adapters/db/drizzle"
import { tenants } from "@/adapters/db/schema"

/**
 * Provision a new tenant: create schema + register in tenants table.
 */
export async function provisionTenant(input: {
  name: string
  slug: string
  domain?: string
  config?: Record<string, unknown>
}): Promise<{ tenantId: string; schemaName: string }> {
  const pool = getPool()
  const db = getDb()

  // Sanitize schema name: only lowercase alphanumeric + underscores
  const sanitizedSlug = input.slug.toLowerCase().replace(/[^a-z0-9]/g, "_")
  const schemaName = `tenant_${sanitizedSlug}`

  // SECURITY: Strict whitelist validation — prevent SQL injection in DDL
  if (!/^tenant_[a-z0-9_]+$/.test(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`)
  }

  // Validate schema name length (PostgreSQL limit: 63 chars)
  if (schemaName.length > 63) {
    throw new Error(`Schema name too long: ${schemaName} (max 63 chars)`)
  }

  // Validate slug is not empty after sanitization
  if (sanitizedSlug.length === 0) {
    throw new Error("Tenant slug cannot be empty after sanitization")
  }

  // SECURITY: Use pg's identifier quoting to prevent SQL injection.
  // Although schemaName is whitelist-validated above, quoting provides
  // defense-in-depth for DDL operations that cannot use $1 parameters.
  const quotedSchema = `"${schemaName}"`

  // Create the schema (DDL — must use raw pg, not Drizzle)
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`)

  // Create tables in the new schema by cloning public schema structure
  // Each statement uses the quoted schema name for safety
  const tables = ["events", "leads", "orders", "users", "audit_events"]
  for (const table of tables) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${quotedSchema}."${table}" (LIKE public."${table}" INCLUDING ALL)`,
    )
  }

  // Register tenant in the public.tenants table
  const result = await db
    .insert(tenants)
    .values({
      name: input.name,
      slug: input.slug,
      schemaName,
      domain: input.domain ?? null,
      config: JSON.stringify(input.config ?? {}),
    })
    .returning({ id: tenants.id })

  const tenantId = result[0]?.id
  if (!tenantId) throw new Error("Failed to insert tenant record")

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "tenant_provisioned",
      tenantId,
      slug: input.slug,
      schemaName,
    }),
  )

  return { tenantId, schemaName }
}
