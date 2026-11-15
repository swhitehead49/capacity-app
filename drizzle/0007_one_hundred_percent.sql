-- One 100% (sean, 15 Nov 2026): overhead + contingency + Run/Fix/Sustain/Change/Enabling now add up to 100% of
-- available days. Before, the work types added up to 100% of what was left after overhead and contingency.
-- This converts saved settings so every planner number stays the same. See oneHundredMigration.test.ts.

-- 1. Overrides that left overhead or contingency blank take them from the team default in force at the period start.
UPDATE "allocation_settings" AS o SET
  "overhead" = COALESCE(o."overhead", (
    SELECT d."overhead" FROM "allocation_settings" d JOIN "planning_periods" p ON p."id" = o."period_id"
    WHERE d."team_id" = o."team_id" AND d."level" = 'Team default' AND d."status" = 'Active' AND d."effective_from" <= p."start_date"
    ORDER BY d."effective_from" DESC, d."id" DESC LIMIT 1)),
  "contingency" = COALESCE(o."contingency", (
    SELECT d."contingency" FROM "allocation_settings" d JOIN "planning_periods" p ON p."id" = o."period_id"
    WHERE d."team_id" = o."team_id" AND d."level" = 'Team default' AND d."status" = 'Active' AND d."effective_from" <= p."start_date"
    ORDER BY d."effective_from" DESC, d."id" DESC LIMIT 1), 0)
WHERE o."level" <> 'Team default' AND (o."overhead" IS NULL OR o."contingency" IS NULL);
--> statement-breakpoint
-- 2. A blank contingency always meant 0%.
UPDATE "allocation_settings" SET "contingency" = 0 WHERE "contingency" IS NULL AND "overhead" IS NOT NULL;
--> statement-breakpoint
-- 3. Re-express each share as a % of available days (the right-hand side uses the old values).
UPDATE "allocation_settings" SET
  "contingency" = (1 - "overhead") * "contingency",
  "run" = (1 - "overhead") * (1 - "contingency") * "run",
  "fix" = (1 - "overhead") * (1 - "contingency") * "fix",
  "sustain" = (1 - "overhead") * (1 - "contingency") * "sustain",
  "change" = (1 - "overhead") * (1 - "contingency") * "change",
  "enabling" = (1 - "overhead") * (1 - "contingency") * "enabling"
WHERE "overhead" IS NOT NULL;
--> statement-breakpoint
UPDATE "standard_allocation" SET
  "contingency" = (1 - "overhead") * "contingency",
  "run" = (1 - "overhead") * (1 - "contingency") * "run",
  "fix" = (1 - "overhead") * (1 - "contingency") * "fix",
  "sustain" = (1 - "overhead") * (1 - "contingency") * "sustain",
  "change" = (1 - "overhead") * (1 - "contingency") * "change",
  "enabling" = (1 - "overhead") * (1 - "contingency") * "enabling";
