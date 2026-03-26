/**
 * Database wrapper for queue and infrastructure operations.
 *
 * Wraps pg Pool with a convenient query interface.
 * Use `getPool()` directly in domain repositories for full Pool access.
 */

import { getPool } from "@/adapters/db/pool"
import type { QueryResult } from "pg"

export const db = {
  async query(
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<Record<string, unknown>>> {
    const pool = getPool()
    return pool.query(sql, values)
  },
}
