import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1, // tests share one seeded database, so run them one at a time
  // Most tests run as an Engineering manager (sean, 15 Nov 2026: the home screen asks who you are). Reference data
  // specs run as an Admin; home.spec.ts starts with no role.
  use: { baseURL: "http://localhost:3100", trace: "off", storageState: "tests/e2e/manager-role.json" },
  webServer: {
    // Fresh database with demo data, then start the app with a fixed "today".
    command: "npm run seed && npx next dev -p 3100",
    url: "http://localhost:3100",
    env: { DATA_DIR: "./data/e2e", OPENHOLIDAYS_FIXTURE_DIR: "tests/fixtures/openholidays", APP_TODAY: "2026-11-08" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
