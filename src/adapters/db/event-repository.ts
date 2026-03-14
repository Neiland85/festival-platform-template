import { getPool } from "./pool"
import type { Event } from "@/domain/events/types"

function rowToEvent(row: Record<string, unknown>): Event {
  return {
    id: row["id"] as string,
    title: row["title"] as string,
    description: row["description"] as string,
    highlight: row["highlight"] as string,
    ticketUrl: row["ticket_url"] as string,
    active: row["active"] as boolean,
    createdAt: new Date(row["created_at"] as string),
  }
}

export async function findAllEvents(): Promise<Event[]> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT id, title, description, highlight, ticket_url, active, created_at
     FROM events
     ORDER BY created_at DESC`
  )
  return result.rows.map(rowToEvent)
}

export async function findEventById(id: string): Promise<Event | null> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT id, title, description, highlight, ticket_url, active, created_at
     FROM events
     WHERE id = $1`,
    [id]
  )
  if (result.rows.length === 0) return null
  return rowToEvent(result.rows[0] as Record<string, unknown>)
}

export async function saveEvent(event: Event): Promise<void> {
  const pool = getPool()
  await pool.query(
    `INSERT INTO events (id, title, description, highlight, ticket_url, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [event.id, event.title, event.description, event.highlight, event.ticketUrl, event.active, event.createdAt]
  )
}

export async function updateEvent(event: Event): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE events
     SET title = $2, description = $3, highlight = $4, ticket_url = $5, active = $6
     WHERE id = $1`,
    [event.id, event.title, event.description, event.highlight, event.ticketUrl, event.active]
  )
}

export async function deleteEvent(id: string): Promise<boolean> {
  const pool = getPool()
  const result = await pool.query(
    `DELETE FROM events WHERE id = $1`,
    [id]
  )
  return (result.rowCount ?? 0) > 0
}
