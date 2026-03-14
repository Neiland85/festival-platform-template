import { getPool } from "@/adapters/db/pool"
import { dequeueLead } from "./queueFacade"
import * as Sentry from "@sentry/nextjs"

let running = false

export async function processLeadQueue() {

  if (running) return

  running = true

  try {

    const lead = await dequeueLead()

    if (!lead) {
      running = false
      return
    }

    const pool = getPool()

    await pool.query(
      `
      INSERT INTO leads (id, email, event_id, ip_address, consent_given,
                         name, surname, phone, profession, source, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      ON CONFLICT (email, event_id) DO UPDATE SET
        name           = COALESCE(EXCLUDED.name, leads.name),
        surname        = COALESCE(EXCLUDED.surname, leads.surname),
        phone          = COALESCE(EXCLUDED.phone, leads.phone),
        profession     = COALESCE(EXCLUDED.profession, leads.profession),
        consent_given  = EXCLUDED.consent_given,
        source         = EXCLUDED.source
      `,
      [
        lead.email,
        lead.eventId,
        lead.ipAddress,
        lead.consentGiven,
        lead.name ?? null,
        lead.surname ?? null,
        lead.phone ?? null,
        lead.profession ?? null,
        lead.source ?? "organic",
      ]
    )

  } catch (err) {

    console.error("lead worker error", err)
    Sentry.captureException(err, { tags: { module: "leadWorker" } })

  } finally {

    running = false

  }
}
