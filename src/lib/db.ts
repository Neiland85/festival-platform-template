/**
 * Database wrapper for queue operations
 *
 * Wraps pg Pool with convenient query interface
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
