/**
 * Drizzle ORM singleton — wraps the existing pg Pool.
 *
 * Provides type-safe query building using the schema defined in schema.ts.
 * Replaces raw `pool.query()` calls with Drizzle's query builder.
 *
 * Uses the same connection pool from pool.ts (no extra connections).
 */

import { drizzle } from "drizzle-orm/node-postgres"
import { getPool } from "./pool"
import * as schema from "./schema"

const globalDrizzle = globalThis as unknown as {
  __drizzle?: ReturnType<typeof drizzle>
}

/**
 * Returns a lazily-initialized Drizzle instance backed by the pg Pool.
 * Safe to call on every request — returns the cached instance.
 */
export function getDb() {
  if (!globalDrizzle.__drizzle) {
    globalDrizzle.__drizzle = drizzle(getPool(), { schema })
  }
  return globalDrizzle.__drizzle
}
