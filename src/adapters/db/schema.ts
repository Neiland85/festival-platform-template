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
} from "drizzle-orm/pg-core"

/* ─── Enums ─── */

export const userRoleEnum = pgEnum("user_role", ["admin", "editor", "viewer"])

/* ─── Events ─── */

export const events = pgTable("events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  highlight: varchar("highlight", { length: 255 }).notNull(),
  ticketUrl: text("ticket_url").notNull(),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 002: capacity
  capacity: integer("capacity").default(5000),
  // 003: metadata
  eventDate: date("event_date"),
  logo: text("logo"),
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
