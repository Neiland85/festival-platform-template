export type OrderStatus = "pending" | "completed" | "cancelled" | "refunded"

export interface Order {
  id: string
  stripeSessionId: string | null
  eventId: string
  customerEmail: string
  amountCents: number
  currency: string
  status: OrderStatus
  quantity: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateOrderInput {
  eventId: string
  customerEmail: string
  amountCents: number
  currency?: string
  quantity?: number
}
