/**
 * seed.ts — Commercial-grade demo data for the Festival Platform.
 *
 * Seeds all 4 domain tables: events → users → leads → orders.
 * Designed to look realistic in dashboards and client demos.
 *
 * Usage:  pnpm db:seed
 * Safety: fully idempotent (ON CONFLICT DO NOTHING on every insert).
 */

import { Client, type QueryResult } from "pg"
import { createHash } from "node:crypto"

// ─── Helpers ────────────────────────────────────────────────────

/** Deterministic UUIDs so re-runs don't create duplicates in uuid-pk tables. */
function deterministicUUID(namespace: string, key: string): string {
  const hash = createHash("sha256").update(`${namespace}:${key}`).digest("hex")
  // Format as UUID v4-like: 8-4-4-4-12
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "a" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-")
}

/** Fake password hash (SHA-256). NOT for production — just demo-safe placeholder. */
function fakePwHash(plain: string): string {
  return createHash("sha256").update(plain).digest("hex")
}

function logInsert(label: string, result: QueryResult): void {
  if (result.rowCount && result.rowCount > 0) {
    console.log(`  ✅  ${label}`)
  } else {
    console.log(`  ⏭️   Skipped (exists): ${label}`)
  }
}

// ─── Seed Data ──────────────────────────────────────────────────

const EVENTS = [
  {
    id: "neon-nights-festival-2026",
    title: "Neon Nights Festival 2026",
    description:
      "El festival de música electrónica más grande del sur de Europa. " +
      "Tres noches con más de 80 artistas en 5 escenarios, mapping 3D sobre " +
      "la fachada del recinto y zonas gastronómicas con chefs estrella Michelin.",
    highlight: "3 noches · 5 escenarios · 80+ artistas",
    ticket_url: "/events/neon-nights-festival-2026/tickets",
    active: true,
    capacity: 15_000,
    event_date: "2026-07-18",
    price_cents: 12_500,
    logo: "/images/events/neon-nights-logo.svg",
    tickets_sold: 8_742,
  },
  {
    id: "jazz-en-el-jardin",
    title: "Jazz en el Jardín",
    description:
      "Una velada íntima de jazz, soul y neo-funk en los jardines botánicos de la ciudad. " +
      "Cócteles de autor, food trucks gourmet y sesiones de live painting mientras " +
      "suena la mejor música en directo bajo las estrellas.",
    highlight: "Íntimo · Jardines · Live painting",
    ticket_url: "/events/jazz-en-el-jardin/tickets",
    active: true,
    capacity: 1_200,
    event_date: "2026-08-22",
    price_cents: 4_500,
    logo: "/images/events/jazz-jardin-logo.svg",
    tickets_sold: 1_087,
  },
  {
    id: "folk-and-roots-weekender",
    title: "Folk & Roots Weekender",
    description:
      "Fin de semana de retiro en el campo con lo mejor del indie folk, " +
      "americana y world music. Acampada incluida, talleres de luthería, " +
      "sesiones acústicas junto al lago y mercado artesano.",
    highlight: "Camping · Talleres · Sesiones al lago",
    ticket_url: "/events/folk-and-roots-weekender/tickets",
    active: true,
    capacity: 3_500,
    event_date: "2026-09-12",
    price_cents: 7_800,
    logo: "/images/events/folk-roots-logo.svg",
    tickets_sold: 890,
  },
  {
    id: "urban-beats-club-tour",
    title: "Urban Beats Club Tour",
    description:
      "Circuito de 4 salas en una noche: hip-hop, R&B, afrobeats y dancehall. " +
      "Pulsera única para acceso a los 4 venues con shuttle gratuito entre ellos. " +
      "Line-up sorpresa anunciado 48h antes del evento.",
    highlight: "4 salas · 1 noche · Shuttle incluido",
    ticket_url: "/events/urban-beats-club-tour/tickets",
    active: true,
    capacity: 4_000,
    event_date: "2026-10-05",
    price_cents: 3_200,
    logo: null,
    tickets_sold: 2_450,
  },
  {
    id: "solsticio-techno-2026",
    title: "Solsticio Techno 2026",
    description:
      "24 horas ininterrumpidas de techno y minimal en una antigua fábrica reconvertida. " +
      "Sound system Funktion-One, visuales generativos en tiempo real y zona chill-out " +
      "con amanecer sobre el río.",
    highlight: "24h non-stop · Fábrica · Funktion-One",
    ticket_url: "/events/solsticio-techno-2026/tickets",
    active: false,
    capacity: 2_500,
    event_date: "2026-06-21",
    price_cents: 5_500,
    logo: "/images/events/solsticio-logo.svg",
    tickets_sold: 2_500, // sold out
  },
  {
    id: "primavera-acustica",
    title: "Primavera Acústica",
    description:
      "Festival diurno al aire libre con formato unplugged. Singer-songwriters, " +
      "cuartetos de cuerda y poesía musical en un anfiteatro natural rodeado de viñedos. " +
      "Maridaje de vinos locales incluido en la entrada premium.",
    highlight: "Unplugged · Viñedos · Wine pairing",
    ticket_url: "/events/primavera-acustica/tickets",
    active: true,
    capacity: 800,
    event_date: "2026-05-09",
    price_cents: 6_000,
    logo: "/images/events/primavera-acustica-logo.svg",
    tickets_sold: 312,
  },
  {
    id: "bass-culture-open-air",
    title: "Bass Culture Open Air",
    description:
      "Drum & bass, dubstep y UK garage en formato open air junto a la playa. " +
      "Dos stages, competición de MCs, taller de producción con Ableton y " +
      "afterparty secreta en ubicación revelada por SMS.",
    highlight: "Playa · D&B · Afterparty secreta",
    ticket_url: "/events/bass-culture-open-air/tickets",
    active: false,
    capacity: 6_000,
    event_date: "2026-04-15",
    price_cents: null, // pricing TBD
    logo: null,
    tickets_sold: 0,
  },
]

/**
 * NOTE: These users are seeded into the `users` table for RBAC and audit
 * trail purposes. They are NOT used for dashboard login.
 *
 * Dashboard login uses ADMIN_PASSWORD env var (see .env.local).
 * The `users` table will be used when the auth system migrates from
 * env-var to database-backed authentication.
 */
const USERS = [
  {
    id_key: "admin-demo",
    email: "admin@festival-demo.com",
    name: "Demo Admin",
    password_plain: "admin123",
    role: "admin" as const,
  },
  {
    id_key: "editor-maria",
    email: "maria.garcia@festival-demo.com",
    name: "María García",
    password_plain: "editor123",
    role: "editor" as const,
  },
  {
    id_key: "viewer-carlos",
    email: "carlos.lopez@festival-demo.com",
    name: "Carlos López",
    password_plain: "viewer123",
    role: "viewer" as const,
  },
]

const LEADS = [
  { id: "lead-001", email: "ana.martinez@gmail.com",    event_id: "neon-nights-festival-2026", name: "Ana",    surname: "Martínez",  phone: "+34612345678", profession: "Designer",          source: "instagram" },
  { id: "lead-002", email: "pedro.ruiz@outlook.com",    event_id: "neon-nights-festival-2026", name: "Pedro",  surname: "Ruiz",      phone: "+34623456789", profession: "Developer",          source: "organic" },
  { id: "lead-003", email: "laura.fernandez@yahoo.com", event_id: "jazz-en-el-jardin",         name: "Laura",  surname: "Fernández", phone: "+34634567890", profession: "Architect",          source: "google_ads" },
  { id: "lead-004", email: "miguel.santos@gmail.com",   event_id: "jazz-en-el-jardin",         name: "Miguel", surname: "Santos",    phone: null,           profession: "Musician",           source: "referral" },
  { id: "lead-005", email: "sofia.delgado@icloud.com",  event_id: "folk-and-roots-weekender",   name: "Sofía",  surname: "Delgado",   phone: "+34656789012", profession: "Teacher",            source: "facebook_ads" },
  { id: "lead-006", email: "david.moreno@proton.me",    event_id: "urban-beats-club-tour",      name: "David",  surname: "Moreno",    phone: "+34667890123", profession: "Marketing Manager",  source: "organic" },
  { id: "lead-007", email: "elena.jimenez@gmail.com",   event_id: "solsticio-techno-2026",      name: "Elena",  surname: "Jiménez",   phone: null,           profession: "DJ / Producer",      source: "instagram" },
  { id: "lead-008", email: "pablo.navarro@gmail.com",   event_id: "primavera-acustica",         name: "Pablo",  surname: "Navarro",   phone: "+34689012345", profession: "Sommelier",          source: "organic" },
]

const ORDERS = [
  { id_key: "order-001", event_id: "neon-nights-festival-2026", email: "ana.martinez@gmail.com",    amount_cents: 12_500, status: "completed"  as const, quantity: 1 },
  { id_key: "order-002", event_id: "neon-nights-festival-2026", email: "pedro.ruiz@outlook.com",    amount_cents: 25_000, status: "completed"  as const, quantity: 2 },
  { id_key: "order-003", event_id: "jazz-en-el-jardin",         email: "laura.fernandez@yahoo.com", amount_cents: 4_500,  status: "completed"  as const, quantity: 1 },
  { id_key: "order-004", event_id: "jazz-en-el-jardin",         email: "miguel.santos@gmail.com",   amount_cents: 9_000,  status: "pending"    as const, quantity: 2 },
  { id_key: "order-005", event_id: "folk-and-roots-weekender",   email: "sofia.delgado@icloud.com",  amount_cents: 7_800,  status: "completed"  as const, quantity: 1 },
  { id_key: "order-006", event_id: "urban-beats-club-tour",      email: "david.moreno@proton.me",    amount_cents: 6_400,  status: "completed"  as const, quantity: 2 },
  { id_key: "order-007", event_id: "solsticio-techno-2026",      email: "elena.jimenez@gmail.com",   amount_cents: 5_500,  status: "refunded"   as const, quantity: 1 },
  { id_key: "order-008", event_id: "neon-nights-festival-2026", email: "random.buyer@hotmail.com",  amount_cents: 37_500, status: "completed"  as const, quantity: 3 },
  { id_key: "order-009", event_id: "primavera-acustica",         email: "pablo.navarro@gmail.com",   amount_cents: 6_000,  status: "cancelled"  as const, quantity: 1 },
  { id_key: "order-010", event_id: "neon-nights-festival-2026", email: "group.booking@company.es",  amount_cents: 125_000,status: "pending"    as const, quantity: 10 },
]

// ─── SQL Statements ─────────────────────────────────────────────

const SQL = {
  event: `
    INSERT INTO events (id, title, description, highlight, ticket_url, active, capacity, event_date, price_cents, logo, tickets_sold)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO NOTHING`,

  user: `
    INSERT INTO users (id, email, name, password_hash, role, active)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (email) DO NOTHING`,

  lead: `
    INSERT INTO leads (id, email, event_id, ip_address, consent_given, name, surname, phone, profession, source)
    VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9)
    ON CONFLICT ON CONSTRAINT leads_email_event_id_key DO NOTHING`,

  order: `
    INSERT INTO orders (id, stripe_session_id, event_id, customer_email, amount_cents, currency, status, quantity)
    VALUES ($1, $2, $3, $4, $5, 'EUR', $6, $7)
    ON CONFLICT (id) DO NOTHING`,
}

// ─── Seed Functions ─────────────────────────────────────────────

async function seedEvents(client: Client): Promise<void> {
  console.log("\n📅  Seeding events...")
  for (const e of EVENTS) {
    const r = await client.query(SQL.event, [
      e.id, e.title, e.description, e.highlight, e.ticket_url,
      e.active, e.capacity, e.event_date, e.price_cents, e.logo, e.tickets_sold,
    ])
    logInsert(e.title, r)
  }
}

async function seedUsers(client: Client): Promise<void> {
  console.log("\n👤  Seeding users...")
  for (const u of USERS) {
    const uid = deterministicUUID("user", u.id_key)
    const r = await client.query(SQL.user, [
      uid, u.email, u.name, fakePwHash(u.password_plain), u.role,
    ])
    logInsert(`${u.name} (${u.role})`, r)
  }
}

async function seedLeads(client: Client): Promise<void> {
  console.log("\n📧  Seeding leads...")
  for (const l of LEADS) {
    const r = await client.query(SQL.lead, [
      l.id, l.email, l.event_id, "127.0.0.1",
      l.name, l.surname, l.phone, l.profession, l.source,
    ])
    logInsert(`${l.name} ${l.surname} → ${l.event_id}`, r)
  }
}

async function seedOrders(client: Client): Promise<void> {
  console.log("\n🛒  Seeding orders...")
  for (const o of ORDERS) {
    const oid = deterministicUUID("order", o.id_key)
    const fakeStripeSession = `cs_demo_${o.id_key.replace("order-", "")}`
    const r = await client.query(SQL.order, [
      oid, fakeStripeSession, o.event_id, o.email,
      o.amount_cents, o.status, o.quantity,
    ])
    logInsert(`${o.email} — ${o.quantity}x ${o.event_id} (${o.status})`, r)
  }
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

    // Order matters: events first (FK target), then users, leads, orders.
    await seedEvents(client)
    await seedUsers(client)
    await seedLeads(client)
    await seedOrders(client)

    // Summary
    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM events) AS events,
        (SELECT count(*) FROM users)  AS users,
        (SELECT count(*) FROM leads)  AS leads,
        (SELECT count(*) FROM orders) AS orders
    `)
    const c = counts.rows[0]
    console.log("\n══════════════════════════════════════════════")
    console.log("  🌱  Seed complete!")
    console.log(`  Events: ${c.events}  |  Users: ${c.users}  |  Leads: ${c.leads}  |  Orders: ${c.orders}`)
    console.log("══════════════════════════════════════════════")

  } catch (error) {
    console.error("❌  Seed failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
