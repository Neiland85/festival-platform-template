import { Pool } from "pg"

let pool: Pool | undefined

export function getPool() {
  if (!pool) {
    const connectionString = process.env["DATABASE_URL"]

    if (!connectionString) {
      throw new Error("DATABASE_URL not configured")
    }

    pool = new Pool({
      connectionString,
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
