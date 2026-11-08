import { expect, test } from "@playwright/test";

// UC03: set a team's default allocation. Seed: T017 DRGW has an Active default from 1 Jan 2026
// (20% overhead, 30/20/20/30); T001 has none. Changes here start after sprint S001.

test("the planner links to the team default page, which shows the default in force", async ({ page }) => {
  await page.goto("/teams/T017");
  await page.getByRole("link", { name: "Team default" }).click();
  await expect(page.getByRole("heading", { name: "DRGW default" })).toBeVisible();
  await expect(page.getByRole("region", { name: "In force today" }))
    .toContainText("Overhead 20% · Run 30% · Fix 20% · Sustain 20% · Change 30%");
});

test("the form starts from the current values", async ({ page }) => {
  await page.goto("/teams/T017/default");
  const form = page.getByRole("form", { name: "New default" });
  await expect(form.getByLabel("Overhead %")).toHaveValue("20");
  await expect(form.getByLabel("Run %")).toHaveValue("30");
});

test("a split that doesn't add up to 100% is explained and nothing is saved", async ({ page }) => {
  await page.goto("/teams/T017/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2027-01-01");
  await form.getByLabel("Run %").fill("50");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("100");
  await expect(form.getByLabel("Run %")).toHaveValue("50");
  await expect(page.getByRole("table", { name: "Default history" }).getByRole("row")).toHaveCount(2); // header + 1
});

test("save a future default: it is listed but today's stays in force", async ({ page }) => {
  await page.goto("/teams/T017/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2027-01-01");
  await form.getByLabel("Overhead %").fill("15");
  await form.getByLabel("Reason").fill("New year plan");
  await form.getByRole("button", { name: "Save default" }).click();
  const history = page.getByRole("table", { name: "Default history" });
  await expect(history.getByRole("row", { name: /1 Jan 2027/ })).toContainText("New year plan");
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Overhead 20%");
});

test("a team without a default gets one, and the planner uses it", async ({ page }) => {
  await page.goto("/teams/T001/default");
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("No default yet");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2026-11-09");
  await form.getByLabel("Overhead %").fill("10");
  await form.getByLabel("Run %").fill("25");
  await form.getByLabel("Fix %").fill("25");
  await form.getByLabel("Sustain %").fill("25");
  await form.getByLabel("Change %").fill("25");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Overhead 10% · Run 25%");
  await page.goto("/teams/T001");
  await expect(page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S002/ })).toContainText("Team default");
});
