import { expect, test } from "@playwright/test";

// Enabling/Training (sean, 15 Nov 2026): a fifth work type beside Run, Fix, Sustain and Change.

test("the planner has an Enabling/Training column", async ({ page }) => {
  await page.goto("/p/default/teams/T017");
  const sprints = page.getByRole("table", { name: "Sprints" });
  await expect(sprints.getByRole("columnheader", { name: "Enabling/Training" })).toBeVisible();
});

test("the team default form sets Enabling/Training", async ({ page }) => {
  await page.goto("/p/default/teams/T002/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2026-11-02");
  await form.getByLabel("Overhead %").fill("20");
  await form.getByLabel("Contingency %").fill("0");
  await form.getByLabel("Run %").fill("20");
  await form.getByLabel("Fix %").fill("10");
  await form.getByLabel("Sustain %").fill("10");
  await form.getByLabel("Change %").fill("30");
  await form.getByLabel("Enabling/Training %").fill("10");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Change 30% · Enabling/Training 10%");
});

test("a sprint override sets Enabling/Training", async ({ page }) => {
  await page.goto("/p/default/teams/T017/periods/S008/edit");
  await page.getByLabel("Run %").fill("20");
  await page.getByLabel("Fix %").fill("20");
  await page.getByLabel("Sustain %").fill("10");
  await page.getByLabel("Change %").fill("10");
  await page.getByLabel("Enabling/Training %").fill("20");
  await page.getByLabel("Reason").fill("Training sprint");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams\/T017$/);
  await page.goto("/p/default/teams/T017/periods/S008/edit");
  await expect(page.getByLabel("Enabling/Training %")).toHaveValue("20");
});
