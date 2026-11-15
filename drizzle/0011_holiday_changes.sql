CREATE TABLE "removed_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"country" text NOT NULL,
	"regions" text[] DEFAULT '{}'::text[] NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_holidays" ADD COLUMN "origin" text DEFAULT 'Loaded' NOT NULL;