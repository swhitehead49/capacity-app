-- sean, 26 Nov 2026: Run and Fix become one work type, Maintenance (kept in the "run" column). Add Fix into it.
UPDATE "allocation_settings" SET "run" = "run" + "fix", "fix" = 0 WHERE "fix" <> 0;--> statement-breakpoint
UPDATE "standard_allocation" SET "run" = "run" + "fix", "fix" = 0 WHERE "fix" <> 0;
