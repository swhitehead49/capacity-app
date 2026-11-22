ALTER TABLE "teams" ADD COLUMN "team_lead_first_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "team_lead_last_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "parent_team_lead_first_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "parent_team_lead_last_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "grandparent_team_lead_first_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "grandparent_team_lead_last_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "top_level_lead_first_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "top_level_lead_last_name" text;