import { Pool } from "pg"
import { serverEnv } from "@/lib/env"

let pool: Pool | undefined

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: serverEnv.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
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
