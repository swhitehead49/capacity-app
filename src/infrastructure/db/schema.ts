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
  valueStream: text("value_stream"), // the level just above a team (decision 8 Nov 2026; was "parent group")
  // Where the team is based (sean, 15 Nov 2026). Members keep their own location for public holidays.
  baseLocation: text("base_location").references(() => locations.code),
  // The original workbook's Teams sheet (sean, 15 Nov 2026).
  parentTeamName: text("parent_team_name"),
  parentTeamLeadEmail: text("parent_team_lead_email"),
  grandparentTeamName: text("grandparent_group"),
  grandparentTeamLeadEmail: text("grandparent_team_lead_email"),
  topLevelGroup: text("top_level_group"),
  topLevelLeadEmail: text("top_level_lead_email"),
  sourceHeadcount: integer("source_headcount"),
  idStatus: text("id_status").notNull().default("Provisional"), // Provisional until confirmed with the group leads (Q5)
  dataQualityFlag: text("data_quality_flag"),
  // A team without a value stream can be left out of the project (sean, 15 Nov 2026). Teams in a value stream are always in.
  included: boolean("included").notNull().default(true),
  retiredOn: date("retired_on"),
});

/** BR-20: every name a team has had, from a date. */
export const teamNameHistory = pgTable("team_name_history", {
  id: serial("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id),
  name: text("name").notNull(),
  effectiveFrom: date("effective_from"), // null = the team's name from the start
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

/**
 * System reference data (sean, 15 Nov 2026): the value streams a team can be in. The Default database's copy is the
 * system's list, shared by every project (like \`locations\`, whose Default copy is the system's list of locations).
 */
export const valueStreams = pgTable("value_streams", {
  name: text("name").primaryKey(),
});

/** The value streams in this project (sean, 15 Nov 2026), picked from the system's list. Teams are mapped to them. */
export const projectValueStreams = pgTable("project_value_streams", {
  name: text("name").primaryKey(),
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
  origin: text("origin", { enum: ["Loaded", "Added"] }).notNull().default("Loaded"), // "Added" = added by hand (sean, 15 Nov 2026)
});

/** Loaded holidays removed by hand (sean, 15 Nov 2026), so a reload doesn't bring them back. */
export const removedHolidays = pgTable("removed_holidays", {
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
  contingency: numeric("contingency", { mode: "number" }), // blank = 0% (one 100%, 15 Nov 2026)
  run: numeric("run", { mode: "number" }).notNull(),
  fix: numeric("fix", { mode: "number" }).notNull(),
  sustain: numeric("sustain", { mode: "number" }).notNull(),
  change: numeric("change", { mode: "number" }).notNull(),
  enabling: numeric("enabling", { mode: "number" }).notNull().default(0), // Enabling/Training, 15 Nov 2026
  reason: text("reason"),
  owner: text("owner"),
}, (t) => [check("level_needs_period", sql`(${t.level} = 'Team default') = (${t.periodId} is null)`)]);

/** Standard allocation (sean, 15 Nov 2026): the project's default work allocations that a new team adopts. One row. */
export const standardAllocation = pgTable("standard_allocation", {
  id: integer("id").primaryKey(), // always 1
  overhead: numeric("overhead", { mode: "number" }).notNull(),
  contingency: numeric("contingency", { mode: "number" }).notNull(),
  run: numeric("run", { mode: "number" }).notNull(),
  fix: numeric("fix", { mode: "number" }).notNull(),
  sustain: numeric("sustain", { mode: "number" }).notNull(),
  change: numeric("change", { mode: "number" }).notNull(),
  enabling: numeric("enabling", { mode: "number" }).notNull(),
});

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
  extendTo: date("extend_to"), // optional: the calendar runs at least to this quarter end (sean, 15 Nov 2026)
}, (t) => [check("single_row", sql`${t.id} = 1`)]);
