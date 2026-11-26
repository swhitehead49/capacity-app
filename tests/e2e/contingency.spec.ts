import { expect, test } from "@playwright/test";

// Contingency (decided 8 Nov 2026): a % held back after overhead, before the Run/Fix/Sustain/Change split.

test("the planner has a Contingency column (0 when none is set)", async ({ page }) => {
  await page.goto("/p/default/teams/T017");
  const sprints = page.getByRole("table", { name: "Sprints" });
  await expect(sprints.getByRole("columnheader", { name: "Unplanned" })).toBeVisible();
});

test("a sprint override can set its own contingency", async ({ page }) => {
  await page.goto("/p/default/teams/T017/periods/S003/edit");
  await page.getByLabel("Unplanned %").fill("10");
  await page.getByLabel("Maintenance %").fill("30");
  await page.getByLabel("Reason").fill("Risky release");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams\/T017$/);
  await page.goto("/p/default/teams/T017/periods/S003/edit");
  await expect(page.getByLabel("Unplanned %")).toHaveValue("10");
  await expect(page.getByText("Currently applied: Sprint override")).toBeVisible();
});

test("the team default form sets contingency", async ({ page }) => {
  await page.goto("/p/default/teams/T002/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2026-11-01");
  await form.getByLabel("Organisational %").fill("20");
  await form.getByLabel("Unplanned %").fill("5");
  await form.getByLabel("Maintenance %").fill("35");
  await form.getByLabel("Technical improvements %").fill("20");
  await form.getByLabel("Change %").fill("20");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Organisational 20% · Unplanned 5% · Maintenance 35%");
});
