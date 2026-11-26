import { expect, test } from "@playwright/test";

// UC03: set a team's default allocation. Seed: T017 DRGW has an Active default from 1 Jan 2026
// (20% overhead, Maintenance 40 / Technical improvements 16 / Change 24: one 100%); T001 has none. Changes here start after sprint S001.

test("the planner links to the team default page, which shows the default in force", async ({ page }) => {
  await page.goto("/p/default/teams/T017");
  await page.getByRole("link", { name: "Team default" }).click();
  await expect(page.getByRole("heading", { name: "Team default", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "In force today" }))
    .toContainText("Organisational 20% · Unplanned 0% · Maintenance 40% · Technical improvements 16% · Change 24%");
});

test("the form starts from the current values", async ({ page }) => {
  await page.goto("/p/default/teams/T017/default");
  const form = page.getByRole("form", { name: "New default" });
  await expect(form.getByLabel("Organisational %")).toHaveValue("20");
  await expect(form.getByLabel("Maintenance %")).toHaveValue("40");
});

test("a split that doesn't add up to 100% is explained and nothing is saved", async ({ page }) => {
  await page.goto("/p/default/teams/T017/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2027-01-01");
  await form.getByLabel("Maintenance %").fill("50");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("must add up to 100% (they add up to 110%)");
  await expect(form.getByLabel("Maintenance %")).toHaveValue("50");
  await expect(page.getByRole("table", { name: "Default history" }).getByRole("row")).toHaveCount(2); // header + 1
});

test("save a future default: it is listed but today's stays in force", async ({ page }) => {
  await page.goto("/p/default/teams/T017/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2027-01-01");
  await form.getByLabel("Organisational %").fill("15");
  await form.getByLabel("Maintenance %").fill("45");
  await form.getByLabel("Reason").fill("New year plan");
  await form.getByRole("button", { name: "Save default" }).click();
  const history = page.getByRole("table", { name: "Default history" });
  await expect(history.getByRole("row", { name: /1 Jan 2027/ })).toContainText("New year plan");
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Organisational 20%");
});

test("a team without a default gets one, and the planner uses it", async ({ page }) => {
  await page.goto("/p/default/teams/T001/default");
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("No default yet");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2026-11-01");
  await form.getByLabel("Organisational %").fill("20");
  await form.getByLabel("Maintenance %").fill("40");
  await form.getByLabel("Technical improvements %").fill("20");
  await form.getByLabel("Change %").fill("20");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Organisational 20% · Unplanned 0% · Maintenance 40%");
  await page.goto("/p/default/teams/T001");
  await expect(page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S002/ })).toContainText("Team default");
});
