import { expect, test } from "@playwright/test";

// Contingency (decided 8 Nov 2026): a % held back after overhead, before the Run/Fix/Sustain/Change split.

test("the planner has a Contingency column (0 when none is set)", async ({ page }) => {
  await page.goto("/teams/T017");
  const sprints = page.getByRole("table", { name: "Sprints" });
  await expect(sprints.getByRole("columnheader", { name: "Contingency" })).toBeVisible();
});

test("a sprint override can set its own contingency", async ({ page }) => {
  await page.goto("/teams/T017/periods/S003/edit");
  await page.getByLabel("Contingency % (blank = inherit)").fill("10");
  await page.getByLabel("Reason").fill("Risky release");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/teams\/T017$/);
  await page.goto("/teams/T017/periods/S003/edit");
  await expect(page.getByText("contingency 10% from Sprint override")).toBeVisible();
});

test("the team default form sets contingency", async ({ page }) => {
  await page.goto("/teams/T002/default");
  const form = page.getByRole("form", { name: "New default" });
  await form.getByLabel("Effective from").fill("2026-11-01");
  await form.getByLabel("Overhead %").fill("20");
  await form.getByLabel("Contingency %").fill("5");
  await form.getByLabel("Run %").fill("25");
  await form.getByLabel("Fix %").fill("25");
  await form.getByLabel("Sustain %").fill("25");
  await form.getByLabel("Change %").fill("25");
  await form.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByRole("region", { name: "In force today" })).toContainText("Overhead 20% · Contingency 5% · Run 25%");
});
