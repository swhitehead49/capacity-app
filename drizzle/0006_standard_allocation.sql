CREATE TABLE "standard_allocation" (
	"id" integer PRIMARY KEY NOT NULL,
	"overhead" numeric NOT NULL,
	"contingency" numeric NOT NULL,
	"run" numeric NOT NULL,
	"fix" numeric NOT NULL,
	"sustain" numeric NOT NULL,
	"change" numeric NOT NULL,
	"enabling" numeric NOT NULL
);
