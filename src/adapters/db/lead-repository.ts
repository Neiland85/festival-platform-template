/**
 * Lead repository — Drizzle ORM query builder.
 *
 * Migrated from raw pg queries to type-safe Drizzle operations.
 * Same function signatures — no breaking changes for consumers.
 */

import { eq, isNull, desc, sql } from "drizzle-orm"
import { getDb } from "./drizzle"
import { leads } from "./schema"

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

export async function saveLead(lead: LeadInput) {
  const db = getDb()

  await db
    .insert(leads)
    .values({
      id: lead.id,
      email: lead.email,
      eventId: lead.eventId,
      ipAddress: lead.ipAddress,
      consentGiven: lead.consentGiven,
      name: lead.name ?? null,
      surname: lead.surname ?? null,
      phone: lead.phone ?? null,
      profession: lead.profession ?? null,
      source: lead.source,
      createdAt: lead.createdAt,
    })
    .onConflictDoUpdate({
      target: [leads.email, leads.eventId],
      set: {
        name: sql`COALESCE(EXCLUDED.name, ${leads.name})`,
        surname: sql`COALESCE(EXCLUDED.surname, ${leads.surname})`,
        phone: sql`COALESCE(EXCLUDED.phone, ${leads.phone})`,
        profession: sql`COALESCE(EXCLUDED.profession, ${leads.profession})`,
        source: sql`EXCLUDED.source`,
      },
    })
}

export async function findLeads(limit = 100) {
  const db = getDb()

  return db
    .select({
      id: leads.id,
      email: leads.email,
      eventId: leads.eventId,
      ipAddress: leads.ipAddress,
      name: leads.name,
      surname: leads.surname,
      phone: leads.phone,
      profession: leads.profession,
      source: leads.source,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(isNull(leads.deletedAt))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
}
