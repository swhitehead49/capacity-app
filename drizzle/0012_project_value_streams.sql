CREATE TABLE "project_value_streams" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "included" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- The value streams the project's teams already use become the project's own list (sean, 15 Nov 2026).
INSERT INTO "project_value_streams" ("name") SELECT DISTINCT "value_stream" FROM "teams" WHERE "value_stream" IS NOT NULL AND trim("value_stream") <> '' ON CONFLICT DO NOTHING;
