import crypto from "crypto"

export type Lead = {
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

type CreateLeadInput = {
  email: string
  eventId: string
  ipAddress: string
  consentGiven: boolean
  name?: string
  surname?: string
  phone?: string
  profession?: string
  source?: string
}

export function createLead(input: CreateLeadInput): Lead {

  const email = input.email.trim().toLowerCase()

  return {
    id: crypto.randomUUID(),
    email,
    eventId: input.eventId,
    ipAddress: input.ipAddress,
    consentGiven: input.consentGiven,
    name: input.name?.trim() || undefined,
    surname: input.surname?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    profession: input.profession?.trim() || undefined,
    source: input.source ?? "organic",
    createdAt: new Date()
  }

}
