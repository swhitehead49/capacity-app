CREATE TABLE "value_streams" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "parent_team_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "parent_team_lead_email" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "grandparent_team_lead_email" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "top_level_lead_email" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "source_headcount" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "id_status" text DEFAULT 'Provisional' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "data_quality_flag" text;--> statement-breakpoint
UPDATE "teams" SET "id_status" = 'Confirmed' WHERE "id_confirmed";--> statement-breakpoint
-- The value streams teams already use become reference data (sean, 15 Nov 2026).
INSERT INTO "value_streams" ("name") SELECT DISTINCT "value_stream" FROM "teams" WHERE "value_stream" IS NOT NULL AND trim("value_stream") <> '' ON CONFLICT DO NOTHING;
