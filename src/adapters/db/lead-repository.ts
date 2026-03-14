import { getPool } from "./pool"

type LeadInput = {
  id: string
  email: string
  eventId: string
  ipAddress: string
  consentGiven: boolean
  name?: string
  surname?: string
  phone?: string
  profession?: string
  source: string
  createdAt: Date
}

export async function saveLead(lead: LeadInput){

  const pool = getPool()

  await pool.query(
    `INSERT INTO leads (id, email, event_id, ip_address, consent_given,
                        name, surname, phone, profession, source, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (email, event_id) DO UPDATE SET
       name       = COALESCE(EXCLUDED.name, leads.name),
       surname    = COALESCE(EXCLUDED.surname, leads.surname),
       phone      = COALESCE(EXCLUDED.phone, leads.phone),
       profession = COALESCE(EXCLUDED.profession, leads.profession),
       source     = EXCLUDED.source`,
    [
      lead.id,
      lead.email,
      lead.eventId,
      lead.ipAddress,
      lead.consentGiven,
      lead.name ?? null,
      lead.surname ?? null,
      lead.phone ?? null,
      lead.profession ?? null,
      lead.source,
      lead.createdAt
    ]
  )

}

export async function findLeads(limit=100){

  const pool = getPool()

  const result = await pool.query(
    `SELECT id, email, event_id, ip_address, name, surname, phone, profession, source, created_at
     FROM leads
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  )

  return result.rows
}
