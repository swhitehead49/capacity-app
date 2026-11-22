-- FR-18s (sean, 22 Nov 2026): a team is in a project when its tick (included) is on. Teams in a value stream used to be
-- in the project through the value stream alone; tick exactly those, so every project keeps the same teams.
UPDATE "teams" SET "included" = ("value_stream" IN (SELECT "name" FROM "project_value_streams")) WHERE "value_stream" IS NOT NULL;
