import { describe, expect, it } from "vitest";
import { databaseConfig } from "./databaseConfig";

// Hosting (8 Nov 2026): on your own computer the data lives in a folder; when hosted it lives in
// an online Postgres database given by DATABASE_URL.

describe("databaseConfig", () => {
  it("uses the local folder by default", () => {
    expect(databaseConfig({})).toEqual({ kind: "folder", dir: "./data/dev" });
  });

  it("uses DATA_DIR when set (tests use their own folder)", () => {
    expect(databaseConfig({ DATA_DIR: "./data/e2e" })).toEqual({ kind: "folder", dir: "./data/e2e" });
  });

  it("uses the online database when DATABASE_URL is set", () => {
    expect(databaseConfig({ DATABASE_URL: "postgresql://u:p@host/db?sslmode=require" }))
      .toEqual({ kind: "postgres", url: "postgresql://u:p@host/db?sslmode=require" });
  });

  it("refuses a DATABASE_URL that isn't a Postgres address, so a typo can't go unnoticed", () => {
    expect(() => databaseConfig({ DATABASE_URL: "mysql://x" })).toThrow("DATABASE_URL must start with postgres:// or postgresql://");
  });
});
