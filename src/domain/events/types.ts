export type EventId = string

export interface Event {
  id: EventId
  title: string
  description: string
  highlight: string
  ticketUrl: string
  active: boolean
  createdAt: Date
}
