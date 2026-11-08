import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100", trace: "off" },
  webServer: {
    // Fresh database with demo data, then start the app with a fixed "today".
    command: "npm run seed && npx next dev -p 3100",
    url: "http://localhost:3100",
    env: { DATA_DIR: "./data/e2e", APP_TODAY: "2026-11-08" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
