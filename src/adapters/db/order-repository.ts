import { getPool } from "./pool"
import type { Order, OrderStatus, CreateOrderInput } from "@/domain/orders/types"

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row["id"] as string,
    stripeSessionId: (row["stripe_session_id"] as string) ?? null,
    eventId: row["event_id"] as string,
    customerEmail: row["customer_email"] as string,
    amountCents: row["amount_cents"] as number,
    currency: row["currency"] as string,
    status: row["status"] as OrderStatus,
    quantity: row["quantity"] as number,
    createdAt: new Date(row["created_at"] as string),
    updatedAt: new Date(row["updated_at"] as string),
  }
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const pool = getPool()
  const result = await pool.query(
    `INSERT INTO orders (event_id, customer_email, amount_cents, currency, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.eventId, input.customerEmail, input.amountCents, input.currency ?? "EUR", input.quantity ?? 1]
  )
  return rowToOrder(result.rows[0] as Record<string, unknown>)
}

export async function findOrderByStripeSession(sessionId: string): Promise<Order | null> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM orders WHERE stripe_session_id = $1`,
    [sessionId]
  )
  if (result.rows.length === 0) return null
  return rowToOrder(result.rows[0] as Record<string, unknown>)
}

export async function findOrderById(id: string): Promise<Order | null> {
  const pool = getPool()
  const result = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id])
  if (result.rows.length === 0) return null
  return rowToOrder(result.rows[0] as Record<string, unknown>)
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1`,
    [orderId, status]
  )
}

export async function setStripeSessionId(orderId: string, sessionId: string): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE orders SET stripe_session_id = $2, updated_at = NOW() WHERE id = $1`,
    [orderId, sessionId]
  )
}

export async function countOrdersByEvent(eventId: string): Promise<number> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT COALESCE(SUM(quantity), 0) AS total
     FROM orders
     WHERE event_id = $1 AND status IN ('pending', 'completed')`,
    [eventId]
  )
  return parseInt((result.rows[0] as Record<string, unknown>)["total"] as string, 10)
}

export async function findAllOrders(limit = 100, offset = 0): Promise<Order[]> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return result.rows.map((r) => rowToOrder(r as Record<string, unknown>))
}

export async function findOrdersByEvent(eventId: string): Promise<Order[]> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM orders WHERE event_id = $1 ORDER BY created_at DESC`,
    [eventId]
  )
  return result.rows.map((r) => rowToOrder(r as Record<string, unknown>))
}
