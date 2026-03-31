/**
 * seed-spud-demo.ts — Realistic demo data for SPUD end-to-end demos.
 *
 * Creates:
 * - 1 demo event: "AI Growth Summit Madrid 2026"
 * - 60 leads with varied sources, professions, and recency
 * - 8 completed orders for a subset of leads
 *
 * Fully idempotent: ON CONFLICT DO NOTHING on every insert.
 * Deterministic emails/IDs so re-runs never duplicate.
 *
 * Usage:  pnpm seed:spud-demo
 *         (or: npx tsx scripts/seed-spud-demo.ts)
 *
 * After seeding, run SPUD scoring via the dashboard or API:
 *   POST /api/admin/spud/runs  { "goal": "score_all" }
 */

import { Client, type QueryResult } from "pg"
import { createHash } from "node:crypto"

// ─── Helpers (same pattern as scripts/seed.ts) ──────────────────

function deterministicUUID(namespace: string, key: string): string {
  const hash = createHash("sha256").update(`${namespace}:${key}`).digest("hex")
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "a" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-")
}

function logInsert(label: string, result: QueryResult): "created" | "skipped" {
  if (result.rowCount && result.rowCount > 0) {
    console.log(`  ✅  ${label}`)
    return "created"
  }
  console.log(`  ⏭️   Skipped (exists): ${label}`)
  return "skipped"
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(
    Math.floor(Math.random() * 14) + 8,  // 08:00–22:00
    Math.floor(Math.random() * 60),
    0, 0,
  )
  return d
}

// ─── Demo Event ─────────────────────────────────────────────────

const EVENT = {
  id: "ai-growth-summit-madrid-2026",
  title: "AI Growth Summit Madrid 2026",
  description:
    "La cumbre de inteligencia artificial aplicada al crecimiento empresarial. " +
    "Dos días de conferencias, talleres hands-on y networking con líderes de " +
    "producto, ingeniería y marketing de toda Europa.",
  highlight: "2 días · IA aplicada · Networking",
  ticket_url: "/events/ai-growth-summit-madrid-2026/tickets",
  active: true,
  capacity: 500,
  event_date: "2026-06-15",
  price_cents: 29_900,
  logo: "/images/events/ai-summit-logo.svg",
  tickets_sold: 187,
}

// ─── 60 Demo Leads ──────────────────────────────────────────────

const SOURCES = ["referral", "organic", "paid", "social"] as const
const PROFESSIONS = ["developer", "marketer", "founder", "designer", "other"] as const

// Source distribution: referral=18, organic=18, paid=14, social=10
const SOURCE_WEIGHTS: Record<string, number> = {
  referral: 18,
  organic: 18,
  paid: 14,
  social: 10,
}

// Profession distribution: developer=16, marketer=14, founder=12, designer=10, other=8
const PROF_WEIGHTS: Record<string, number> = {
  developer: 16,
  marketer: 14,
  founder: 12,
  designer: 10,
  other: 8,
}

const FIRST_NAMES = [
  "Ana", "Carlos", "María", "David", "Lucía", "Pablo", "Elena", "Javier",
  "Sofía", "Diego", "Laura", "Andrés", "Carmen", "Marcos", "Beatriz",
  "Adrián", "Patricia", "Roberto", "Isabel", "Fernando", "Raquel", "Tomás",
  "Claudia", "Sergio", "Marta", "Daniel", "Nuria", "Álvaro", "Cristina",
  "Jorge", "Irene", "Rubén", "Natalia", "Héctor", "Paula", "Óscar",
  "Eva", "Manuel", "Sara", "Alberto", "Marina", "Guillermo", "Alicia",
  "Enrique", "Teresa", "Miguel", "Lorena", "Víctor", "Silvia", "Antonio",
  "Andrea", "Gonzalo", "Rocío", "Iván", "Julia", "Luis", "Pilar",
  "Rafael", "Rosa", "Francisco",
]

const LAST_NAMES = [
  "García", "Martínez", "López", "Sánchez", "González", "Rodríguez",
  "Fernández", "Pérez", "Gómez", "Díaz", "Moreno", "Muñoz", "Álvarez",
  "Romero", "Navarro", "Torres", "Domínguez", "Ruiz", "Jiménez", "Vázquez",
  "Ramos", "Gil", "Serrano", "Blanco", "Molina", "Castro", "Ortiz",
  "Marín", "Iglesias", "Medina", "Cortés", "Herrero", "Santos", "Delgado",
  "Fuentes", "Cabrera", "Campos", "Reyes", "Vidal", "Aguilar", "Peña",
  "Cruz", "León", "Prieto", "Calvo", "Gallego", "Méndez", "Herrera",
  "Guerrero", "Lozano", "Cano", "Parra", "Vargas", "Flores", "Bravo",
  "Mora", "Pascual", "Suárez", "Arias",
]

interface DemoLead {
  idx: number
  firstName: string
  lastName: string
  email: string
  source: string
  profession: string
  phone: string | null
  daysAgo: number  // recency: 0–90
}

function buildLeads(): DemoLead[] {
  const leads: DemoLead[] = []

  // Build source assignments
  const sourceAssign: string[] = []
  for (const [src, count] of Object.entries(SOURCE_WEIGHTS)) {
    for (let i = 0; i < count; i++) sourceAssign.push(src)
  }

  // Build profession assignments
  const profAssign: string[] = []
  for (const [prof, count] of Object.entries(PROF_WEIGHTS)) {
    for (let i = 0; i < count; i++) profAssign.push(prof)
  }

  for (let i = 0; i < 60; i++) {
    const firstName = FIRST_NAMES[i]!
    const lastName = LAST_NAMES[i]!
    const slug = `${firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`

    leads.push({
      idx: i + 1,
      firstName,
      lastName,
      email: `${slug}@spud-demo.test`,
      source: sourceAssign[i]!,
      profession: profAssign[i]!,
      phone: i % 3 === 0 ? `+346${String(10000000 + i * 1234).slice(0, 8)}` : null,  // 1/3 have phone
      daysAgo: Math.floor((i / 60) * 90),  // spread 0–90 days
    })
  }

  return leads
}

// ─── 8 Completed Orders (for leads with high engagement) ────────

const ORDER_LEAD_INDICES = [0, 1, 4, 7, 12, 18, 25, 35]  // indices into leads array

// ─── SQL ────────────────────────────────────────────────────────

const SQL = {
  event: `
    INSERT INTO events (id, title, description, highlight, ticket_url, active, capacity, event_date, price_cents, logo, tickets_sold)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO NOTHING`,

  lead: `
    INSERT INTO leads (id, email, event_id, ip_address, consent_given, name, surname, phone, profession, source, created_at)
    VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10)
    ON CONFLICT ON CONSTRAINT leads_email_event_id_key DO NOTHING`,

  order: `
    INSERT INTO orders (id, stripe_session_id, event_id, customer_email, amount_cents, currency, status, quantity)
    VALUES ($1, $2, $3, $4, $5, 'EUR', 'completed', $6)
    ON CONFLICT (id) DO NOTHING`,
}

// ─── Seed Functions ─────────────────────────────────────────────

async function seedEvent(client: Client): Promise<void> {
  console.log("\n📅  Seeding demo event...")
  const e = EVENT
  const r = await client.query(SQL.event, [
    e.id, e.title, e.description, e.highlight, e.ticket_url,
    e.active, e.capacity, e.event_date, e.price_cents, e.logo, e.tickets_sold,
  ])
  logInsert(e.title, r)
}

async function seedLeads(client: Client): Promise<{ leads: DemoLead[]; created: number; skipped: number }> {
  console.log("\n📧  Seeding 60 demo leads...")
  const leads = buildLeads()
  let created = 0
  let skipped = 0

  for (const l of leads) {
    const leadId = `spud-demo-lead-${String(l.idx).padStart(3, "0")}`
    const createdAt = daysAgo(l.daysAgo)

    const r = await client.query(SQL.lead, [
      leadId, l.email, EVENT.id, "10.0.0.1",
      l.firstName, l.lastName, l.phone, l.profession, l.source, createdAt,
    ])
    const status = logInsert(`${l.firstName} ${l.lastName} (${l.source}, ${l.profession})`, r)
    if (status === "created") created++
    else skipped++
  }

  return { leads, created, skipped }
}

async function seedOrders(client: Client, leads: DemoLead[]): Promise<{ created: number; skipped: number }> {
  console.log("\n🛒  Seeding 8 completed orders...")
  let created = 0
  let skipped = 0

  for (const idx of ORDER_LEAD_INDICES) {
    const lead = leads[idx]!
    const orderId = deterministicUUID("spud-demo-order", lead.email)
    const fakeStripeSession = `cs_spud_demo_${String(idx + 1).padStart(3, "0")}`
    const quantity = idx < 4 ? 2 : 1
    const amountCents = EVENT.price_cents * quantity

    const r = await client.query(SQL.order, [
      orderId, fakeStripeSession, EVENT.id, lead.email,
      amountCents, quantity,
    ])
    const status = logInsert(`${lead.firstName} ${lead.lastName} — ${quantity}x (${amountCents / 100}€)`, r)
    if (status === "created") created++
    else skipped++
  }

  return { created, skipped }
}

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"]
  if (!databaseUrl) {
    console.error("❌  DATABASE_URL is not set. Aborting seed.")
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
    console.log("🔌  Connected to database")

    await seedEvent(client)
    const { leads, created: leadsCreated, skipped: leadsSkipped } = await seedLeads(client)
    const { created: ordersCreated, skipped: ordersSkipped } = await seedOrders(client, leads)

    // ── Distribution summary ──
    const sourceDist: Record<string, number> = {}
    const profDist: Record<string, number> = {}
    for (const l of leads) {
      sourceDist[l.source] = (sourceDist[l.source] ?? 0) + 1
      profDist[l.profession] = (profDist[l.profession] ?? 0) + 1
    }

    console.log("\n══════════════════════════════════════════════════════")
    console.log("  🌱  SPUD Demo Seed Complete!")
    console.log("══════════════════════════════════════════════════════")
    console.log(`  Event:  ${EVENT.id}`)
    console.log(`  Leads:  ${leadsCreated} created, ${leadsSkipped} skipped (60 total)`)
    console.log(`  Orders: ${ordersCreated} created, ${ordersSkipped} skipped (8 completed)`)
    console.log("")
    console.log("  📊  Source distribution:")
    for (const [src, count] of Object.entries(sourceDist).sort((a, b) => b[1] - a[1])) {
      console.log(`       ${src.padEnd(10)} ${count}`)
    }
    console.log("")
    console.log("  👥  Profession distribution:")
    for (const [prof, count] of Object.entries(profDist).sort((a, b) => b[1] - a[1])) {
      console.log(`       ${prof.padEnd(12)} ${count}`)
    }
    console.log("")
    console.log("  🚀  Next step: run scoring via dashboard or API:")
    console.log('       POST /api/admin/spud/runs  { "goal": "score_all" }')
    console.log("══════════════════════════════════════════════════════")

  } catch (error) {
    console.error("❌  Seed failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
