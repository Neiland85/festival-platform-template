import { Pool } from "pg"
import { serverEnv } from "@/lib/env"

let pool: Pool | undefined

export function getPool() {
  if (!pool) {
    const connStr = serverEnv.DATABASE_URL
    const isLocal =
      connStr.includes("localhost") || connStr.includes("127.0.0.1")

    pool = new Pool({
      connectionString: connStr,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })

    pool.on("error", (err) => {
      console.error("Unexpected pool error:", err.message)
    })
  }

  return pool
}
