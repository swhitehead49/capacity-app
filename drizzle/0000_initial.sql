CREATE TABLE "absences" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_email" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"type" text NOT NULL,
	"day_fraction" numeric DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'Booked' NOT NULL,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "allocation_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"level" text NOT NULL,
	"period_id" text,
	"effective_from" date,
	"status" text DEFAULT 'Draft' NOT NULL,
	"overhead" numeric,
	"run" numeric NOT NULL,
	"fix" numeric NOT NULL,
	"sustain" numeric NOT NULL,
	"change" numeric NOT NULL,
	"reason" text,
	"owner" text,
	CONSTRAINT "level_needs_period" CHECK (("allocation_settings"."level" = 'Team default') = ("allocation_settings"."period_id" is null))
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_email" text NOT NULL,
	"team_id" text NOT NULL,
	"team_allocation" numeric,
	"shared_resource" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"before" jsonb,
	"after" jsonb
);
--> statement-breakpoint
CREATE TABLE "availability_forecasts" (
	"location_code" text NOT NULL,
	"month" text NOT NULL,
	"availability" numeric NOT NULL,
	CONSTRAINT "availability_forecasts_location_code_month_pk" PRIMARY KEY("location_code","month")
);
--> statement-breakpoint
CREATE TABLE "data_quality_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"severity" text NOT NULL,
	"type" text NOT NULL,
	"entity" text NOT NULL,
	"details" text,
	"suggested_action" text,
	"status" text DEFAULT 'Open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holiday_calendars" (
	"country" text NOT NULL,
	"year" integer NOT NULL,
	"source" text NOT NULL,
	"loaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "holiday_calendars_country_year_pk" PRIMARY KEY("country","year")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"code" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"name" text NOT NULL,
	"standard_hours" numeric
);
--> statement-breakpoint
CREATE TABLE "people" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text,
	"location_code" text,
	"contracted_hours" numeric,
	"employment_start" date,
	"employment_end" date,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"parent_period_id" text
);
--> statement-breakpoint
CREATE TABLE "public_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"country" text NOT NULL,
	"regions" text[] DEFAULT '{}'::text[] NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_name_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"effective_from" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_successors" (
	"team_id" text NOT NULL,
	"successor_team_id" text NOT NULL,
	CONSTRAINT "team_successors_team_id_successor_team_id_pk" PRIMARY KEY("team_id","successor_team_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lead_email" text,
	"parent_group" text,
	"grandparent_group" text,
	"top_level_group" text,
	"id_confirmed" boolean DEFAULT false NOT NULL,
	"retired_on" date
);
--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_person_email_people_email_fk" FOREIGN KEY ("person_email") REFERENCES "public"."people"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_settings" ADD CONSTRAINT "allocation_settings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_settings" ADD CONSTRAINT "allocation_settings_period_id_planning_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."planning_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_person_email_people_email_fk" FOREIGN KEY ("person_email") REFERENCES "public"."people"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_forecasts" ADD CONSTRAINT "availability_forecasts_location_code_locations_code_fk" FOREIGN KEY ("location_code") REFERENCES "public"."locations"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_location_code_locations_code_fk" FOREIGN KEY ("location_code") REFERENCES "public"."locations"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_name_history" ADD CONSTRAINT "team_name_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_successors" ADD CONSTRAINT "team_successors_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_successors" ADD CONSTRAINT "team_successors_successor_team_id_teams_id_fk" FOREIGN KEY ("successor_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;