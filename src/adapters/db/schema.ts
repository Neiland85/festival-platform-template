/**
 * Drizzle ORM schema — single source of truth for the DB structure.
 *
 * This file mirrors the current production schema built by migrations 001–005.
 * Drizzle Kit uses it to generate new migration SQL when the schema changes.
 *
 * Repositories still use raw `pg` queries — this file is NOT used at runtime
 * for query building, only for schema governance and migration generation.
 */
import {
  pgTable,
  pgEnum,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  uuid,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core"

/* ─── Enums ─── */

export const userRoleEnum = pgEnum("user_role", ["admin", "editor", "viewer"])
export const orderStatusEnum = pgEnum("order_status", ["reserved", "completed", "expired", "cancelled", "refunded"])

/* ─── Events ─── */

export const events = pgTable("events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  highlight: varchar("highlight", { length: 255 }).notNull(),
  ticketUrl: text("ticket_url").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 002: capacity
  capacity: integer("capacity"),
  // 003: metadata
  eventDate: date("event_date"),
  logo: text("logo"),
  // 006: pricing
  priceCents: integer("price_cents"),
  stripeProductId: text("stripe_product_id"),
  ticketsSold: integer("tickets_sold").notNull().default(0),
}, (table) => [
  index("idx_events_created_at").on(table.createdAt),
])

/* ─── Leads ─── */

export const leads = pgTable("leads", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull().references(() => events.id),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  consentGiven: boolean("consent_given").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 004: profile fields
  name: text("name"),
  surname: text("surname"),
  phone: text("phone"),
  profession: text("profession"),
  source: text("source").notNull().default("organic"),
  // 004: soft delete
  deletedAt: timestamp("deleted_at"),
  // 005: audit link
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => [
  uniqueIndex("leads_email_event_id_key").on(table.email, table.eventId),
  index("idx_leads_event_id").on(table.eventId),
  index("idx_leads_created_at").on(table.createdAt),
  index("leads_source_idx").on(table.source),
])

/* ─── Orders (006: Stripe Checkout) ─── */

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeSessionId: text("stripe_session_id").unique(),
  eventId: varchar("event_id", { length: 255 }).notNull().references(() => events.id),
  customerEmail: text("customer_email").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  status: orderStatusEnum("status").notNull().default("reserved"),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_orders_event_id").on(table.eventId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_created_at").on(table.createdAt),
])

/* ─── Webhook Dead Letters (005: DLQ for failed webhooks) ─── */

export const webhookDeadLetters = pgTable("webhook_dead_letters", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: varchar("provider", { length: 50 }).notNull().default("stripe"),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  payload: text("payload").notNull(),
  error: text("error").notNull(),
  attempts: integer("attempts").notNull().default(1),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_dlq_provider").on(table.provider),
  index("idx_dlq_event_type").on(table.eventType),
  index("idx_dlq_resolved").on(table.resolvedAt),
])

/* ─── Tenants (006: Multi-tenancy) ─── */

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  schemaName: varchar("schema_name", { length: 63 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  config: text("config").notNull().default("{}"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tenants_slug").on(table.slug),
  index("idx_tenants_domain").on(table.domain),
])

/* ─── Audit Events (007: Persistent Audit Log) ─── */

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 100 }).notNull(),
  actor: varchar("actor", { length: 100 }).notNull().default("system"),
  ip: varchar("ip", { length: 45 }).notNull().default("unknown"),
  resource: varchar("resource", { length: 255 }).notNull().default("-"),
  details: text("details").notNull().default("{}"),
  requestId: varchar("request_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_audit_events_action").on(table.action),
  index("idx_audit_events_actor").on(table.actor),
  index("idx_audit_events_created_at").on(table.createdAt),
])

/* ─── SPUD: Enums ─── */

export const spudRunStatusEnum = pgEnum("spud_run_status", [
  "pending", "running", "completed", "failed", "cancelled",
])

export const spudTaskStatusEnum = pgEnum("spud_task_status", [
  "pending", "running", "completed", "failed", "skipped",
])

/* ─── SPUD: Lead Scores ─── */

export const spudLeadScores = pgTable("spud_lead_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: varchar("lead_id", { length: 255 }).notNull().references(() => leads.id),
  score: integer("score").notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),
  factors: jsonb("factors").notNull().default({}),
  runId: uuid("run_id"),
  scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_spud_scores_lead").on(table.leadId),
  index("idx_spud_scores_tier").on(table.tier),
  index("idx_spud_scores_scored_at").on(table.scoredAt),
])

/* ─── SPUD: Runs (008 + 009: approval & idempotency columns) ─── */

export const spudRuns = pgTable("spud_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
  status: spudRunStatusEnum("status").notNull().default("pending"),
  input: text("input").notNull().default("{}"),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  actor: varchar("actor", { length: 100 }).notNull().default("system"),
  // 009: idempotency
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  // 009: approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }),      // pending | approved | rejected | expired
  approvalRequestedBy: varchar("approval_requested_by", { length: 100 }),
  approvalDecidedBy: varchar("approval_decided_by", { length: 100 }),
  approvalDecidedAt: timestamp("approval_decided_at", { withTimezone: true }),
  approvalReason: text("approval_reason"),
}, (table) => [
  index("idx_spud_runs_type").on(table.type),
  index("idx_spud_runs_status").on(table.status),
  index("idx_spud_runs_created_at").on(table.createdAt),
  uniqueIndex("idx_spud_runs_idempotency").on(table.idempotencyKey),
  index("idx_spud_runs_approval").on(table.approvalStatus),
])

/* ─── SPUD: Tasks ─── */

export const spudTasks = pgTable("spud_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => spudRuns.id),
  name: varchar("name", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  status: spudTaskStatusEnum("status").notNull().default("pending"),
  input: text("input").notNull().default("{}"),
  output: text("output"),
  error: text("error"),
  seq: integer("seq").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("idx_spud_tasks_run_id").on(table.runId),
  index("idx_spud_tasks_status").on(table.status),
])

/* ─── SPUD: Memory (009: KV store with TTL) ─── */

export const spudMemory = pgTable("spud_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  memoryKey: varchar("memory_key", { length: 255 }).notNull(),
  value: jsonb("value").notNull().default({}),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_spud_memory_cat_key").on(table.category, table.memoryKey),
  index("idx_spud_memory_category").on(table.category),
  index("idx_spud_memory_expires").on(table.expiresAt),
])

/* ─── SPUD: Segments (009: saved filter snapshots) ─── */

export const spudSegments = pgTable("spud_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  filters: jsonb("filters").notNull(),
  leadCount: integer("lead_count").notNull().default(0),
  createdBy: varchar("created_by", { length: 100 }).notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_spud_segments_name").on(table.name),
])

/* ─── SPUD: Outcomes (009: conversion tracking) ─── */

export const spudOutcomes = pgTable("spud_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: varchar("lead_id", { length: 255 }).notNull(),
  orderId: uuid("order_id").notNull(),
  scoreAtConversion: integer("score_at_conversion"),
  tierAtConversion: varchar("tier_at_conversion", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_spud_outcomes_lead_order").on(table.leadId, table.orderId),
  index("idx_spud_outcomes_lead").on(table.leadId),
  index("idx_spud_outcomes_converted").on(table.convertedAt),
])

/* ─── Users (005: RBAC) ─── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_role_idx").on(table.role),
])
