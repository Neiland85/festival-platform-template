export type LeadId = string

export interface Lead {
  id: LeadId
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
