CREATE TABLE "timeline_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"first_sprint_start" date NOT NULL,
	"sprint_length_days" integer NOT NULL,
	"sprint_prefix" text NOT NULL,
	CONSTRAINT "single_row" CHECK ("timeline_settings"."id" = 1)
);
