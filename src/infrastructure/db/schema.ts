import { sql } from "drizzle-orm";
import {
  boolean, check, date, integer, jsonb, numeric, pgTable, primaryKey, serial, text, timestamp,
} from "drizzle-orm/pg-core";

// Database tables. See docs/data-model.md for why each table exists.
// Percentages are stored as fractions between 0 and 1 (0.25 = 25%).

/** FR-01, FR-18, BR-15: a team. The id is permanent and never reused. */
export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // e.g. "T017"
  name: text("name").notNull(),
  leadEmail: text("lead_email"),
  parentGroup: text("parent_group"),
  grandparentGroup: text("grandparent_group"),
  topLevelGroup: text("top_level_group"),
  idConfirmed: boolean("id_confirmed").notNull().default(false),
  retiredOn: date("retired_on"),
});

/** BR-20: every name a team has had, from a date. */
export const teamNameHistory = pgTable("team_name_history", {
  id: serial("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id),
  name: text("name").notNull(),
  effectiveFrom: date("effective_from").notNull(),
});

/** BR-23: which team(s) replaced a retired team. */
export const teamSuccessors = pgTable("team_successors", {
  teamId: text("team_id").notNull().references(() => teams.id),
  successorTeamId: text("successor_team_id").notNull().references(() => teams.id),
}, (t) => [primaryKey({ columns: [t.teamId, t.successorTeamId] })]);

/** FR-06: a place people work, with its full-time hours. */
export const locations = pgTable("locations", {
  code: text("code").primaryKey(), // ISO 3166-2 region, e.g. "DE-BY"
  country: text("country").notNull(), // e.g. "DE"
  name: text("name").notNull(),
  standardHours: numeric("standard_hours", { mode: "number" }),
});

/** FR-03: a person and their contract. */
export const people = pgTable("people", {
  email: text("email").primaryKey(),
  role: text("role"),
  locationCode: text("location_code").references(() => locations.code),
  contractedHours: numeric("contracted_hours", { mode: "number" }),
  employmentStart: date("employment_start"),
  employmentEnd: date("employment_end"),
  active: boolean("active").notNull().default(true),
});

/** FR-05, BR-21, BR-22: a person's time on a team, between dates. Ending one never deletes it. */
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  personEmail: text("person_email").notNull().references(() => people.email),
  teamId: text("team_id").notNull().references(() => teams.id),
  teamAllocation: numeric("team_allocation", { mode: "number" }),
  sharedResource: boolean("shared_resource").notNull().default(false),
  startDate: date("start_date"),
  endDate: date("end_date"),
});

/** FR-07: one booked absence. */
export const absences = pgTable("absences", {
  id: serial("id").primaryKey(),
  personEmail: text("person_email").notNull().references(() => people.email),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type").notNull(),
  dayFraction: numeric("day_fraction", { mode: "number" }).notNull().default(1),
  status: text("status", { enum: ["Booked", "Cancelled"] }).notNull().default("Booked"),
  source: text("source"),
});

/** FR-20: public holidays (OpenHolidays shape). Empty regions = whole country. */
export const publicHolidays = pgTable("public_holidays", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  country: text("country").notNull(),
  regions: text("regions").array().notNull().default(sql`'{}'::text[]`),
  name: text("name").notNull(),
});

/** BR-10: which country/year holiday calendars have been loaded. */
export const holidayCalendars = pgTable("holiday_calendars", {
  country: text("country").notNull(),
  year: integer("year").notNull(),
  source: text("source").notNull(), // "OpenHolidays API" or "CSV upload"
  loadedAt: timestamp("loaded_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.country, t.year] })]);

/** FR-06: expected monthly availability for a region (0.9 = 90%). */
export const availabilityForecasts = pgTable("availability_forecasts", {
  locationCode: text("location_code").notNull().references(() => locations.code),
  month: text("month").notNull(), // "YYYY-MM"
  availability: numeric("availability", { mode: "number" }).notNull(),
}, (t) => [primaryKey({ columns: [t.locationCode, t.month] })]);

/** FR-08: sprints and quarters. */
export const planningPeriods = pgTable("planning_periods", {
  id: text("id").primaryKey(), // "S001", "2026-Q4"
  type: text("type", { enum: ["Sprint", "Quarter"] }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  parentPeriodId: text("parent_period_id"),
});

/** FR-10, FR-11: team defaults and quarter/sprint overrides in one table. */
export const allocationSettings = pgTable("allocation_settings", {
  id: serial("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id),
  level: text("level", { enum: ["Team default", "Quarter override", "Sprint override"] }).notNull(),
  periodId: text("period_id").references(() => planningPeriods.id), // empty for a team default
  effectiveFrom: date("effective_from"), // team defaults only
  status: text("status", { enum: ["Draft", "Active", "Retired"] }).notNull().default("Draft"),
  overhead: numeric("overhead", { mode: "number" }),
  run: numeric("run", { mode: "number" }).notNull(),
  fix: numeric("fix", { mode: "number" }).notNull(),
  sustain: numeric("sustain", { mode: "number" }).notNull(),
  change: numeric("change", { mode: "number" }).notNull(),
  reason: text("reason"),
  owner: text("owner"),
}, (t) => [check("level_needs_period", sql`(${t.level} = 'Team default') = (${t.periodId} is null)`)]);

/** FR-15: data-quality issue log. */
export const dataQualityIssues = pgTable("data_quality_issues", {
  id: text("id").primaryKey(),
  severity: text("severity", { enum: ["High", "Medium", "Low"] }).notNull(),
  type: text("type").notNull(),
  entity: text("entity").notNull(),
  details: text("details"),
  suggestedAction: text("suggested_action"),
  status: text("status", { enum: ["Open", "Resolved", "Accepted"] }).notNull().default("Open"),
});

/** Audit trail: who changed what, when and why (non-functional requirement). */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  at: timestamp("at").notNull().defaultNow(),
  actor: text("actor").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  before: jsonb("before"),
  after: jsonb("after"),
});

/** FR-08: how sprints are generated. One row only. */
export const timelineSettings = pgTable("timeline_settings", {
  id: integer("id").primaryKey().default(1),
  firstSprintStart: date("first_sprint_start").notNull(),
  sprintLengthDays: integer("sprint_length_days").notNull(),
  sprintPrefix: text("sprint_prefix").notNull(),
}, (t) => [check("single_row", sql`${t.id} = 1`)]);
