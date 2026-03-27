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

  // Sanitize schema name (only lowercase alphanumeric + underscores)
  const schemaName = `tenant_${input.slug.replace(/[^a-z0-9]/g, "_")}`

  // Validate schema name length (PostgreSQL limit: 63 chars)
  if (schemaName.length > 63) {
    throw new Error(`Schema name too long: ${schemaName} (max 63 chars)`)
  }

  // Create the schema (DDL — must use raw pg, not Drizzle)
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)

  // Create tables in the new schema by cloning public schema structure
  await pool.query(`
    SET search_path TO ${schemaName};

    CREATE TABLE IF NOT EXISTS events (LIKE public.events INCLUDING ALL);
    CREATE TABLE IF NOT EXISTS leads (LIKE public.leads INCLUDING ALL);
    CREATE TABLE IF NOT EXISTS orders (LIKE public.orders INCLUDING ALL);
    CREATE TABLE IF NOT EXISTS users (LIKE public.users INCLUDING ALL);
    CREATE TABLE IF NOT EXISTS audit_events (LIKE public.audit_events INCLUDING ALL);

    SET search_path TO public;
  `)

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
