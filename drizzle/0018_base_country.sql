-- FR-18t (sean, 22 Nov 2026): a team's base location is a country code; region location codes belong to people.
ALTER TABLE "teams" DROP CONSTRAINT "teams_base_location_locations_code_fk";--> statement-breakpoint
UPDATE "teams" SET "base_location" = (SELECT "country" FROM "locations" WHERE "locations"."code" = "teams"."base_location")
  WHERE "base_location" IN (SELECT "code" FROM "locations");
