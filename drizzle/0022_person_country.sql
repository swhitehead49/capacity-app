-- FR-05e (sean, 26 Nov 2026): people are in a country, not a region, so only the country's nationwide public holidays apply.
-- 1. A whole-country location (code = country) for each country that has only regions; first region's standard hours.
INSERT INTO "locations" ("code", "country", "name", "standard_hours")
SELECT DISTINCT ON (l."country") l."country", l."country",
  CASE l."country" WHEN 'DE' THEN 'Germany' WHEN 'AT' THEN 'Austria' WHEN 'FR' THEN 'France' WHEN 'BE' THEN 'Belgium'
    WHEN 'IN' THEN 'India' WHEN 'CH' THEN 'Switzerland' WHEN 'NL' THEN 'Netherlands' WHEN 'IT' THEN 'Italy'
    WHEN 'ES' THEN 'Spain' WHEN 'GB' THEN 'United Kingdom' WHEN 'PL' THEN 'Poland' ELSE l."country" END,
  l."standard_hours"
FROM "locations" l WHERE l."code" <> l."country"
ORDER BY l."country", l."code"
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
-- 2. The country's availability forecast for a month: the average of its regions', where the country has none yet.
INSERT INTO "availability_forecasts" ("location_code", "month", "availability")
SELECT l."country", f."month", AVG(f."availability")
FROM "availability_forecasts" f JOIN "locations" l ON l."code" = f."location_code"
WHERE l."code" <> l."country"
GROUP BY l."country", f."month"
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- 3. Everyone in a region moves to its country.
UPDATE "people" SET "location_code" = l."country"
FROM "locations" l
WHERE l."code" = "people"."location_code" AND l."code" <> l."country";
