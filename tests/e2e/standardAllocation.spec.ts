import { expect, test } from "@playwright/test";

// Standard allocation (sean, 15 Nov 2026): each project's default work allocations, adopted by new teams.
// Uses the Imaging project so the Default project's teams are not affected.

test("set the project's standard allocation; a new team starts with it", async ({ page }) => {
  // sean, 15 Nov 2026: the project's settings are on the Reference data page.
  await page.goto("/p/imaging");
  await page.getByRole("banner").getByRole("link", { name: "Reference data" }).click();
  await expect(page).toHaveURL(/\/reference$/);
  await expect(page.getByRole("heading", { name: "Imaging: standard allocation for new teams" })).toBeVisible();
  const form = page.getByRole("form", { name: "Standard allocation" });
  await form.getByLabel("Overhead %").fill("20");
  await form.getByLabel("Contingency %").fill("5");
  await form.getByLabel("Run %").fill("20");
  await form.getByLabel("Fix %").fill("15");
  await form.getByLabel("Sustain %").fill("10");
  await form.getByLabel("Change %").fill("20");
  await form.getByLabel("Enabling/Training %").fill("10");
  await form.getByRole("button", { name: "Save standard allocation" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.goto("/p/imaging/teams/new");
  const add = page.getByRole("form", { name: "Add team" });
  await add.getByLabel("Team ID").fill("T901");
  await add.getByLabel("Name").fill("Imaging Viewer");
  await add.getByRole("button", { name: "Add team" }).click();
  await page.goto("/p/imaging/teams/T901/default");
  await expect(page.getByRole("region", { name: "In force today" }))
    .toContainText("Overhead 20% · Contingency 5% · Run 20% · Fix 15% · Sustain 10% · Change 20% · Enabling/Training 10%");
});

test("a standard allocation that doesn't add up is explained", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.goto("/reference");
  const form = page.getByRole("form", { name: "Standard allocation" });
  await form.getByLabel("Overhead %").fill("20");
  await form.getByLabel("Run %").fill("50");
  await form.getByLabel("Change %").fill("40");
  await form.getByLabel("Enabling/Training %").fill("0");
  await form.getByLabel("Fix %").fill("0");
  await form.getByLabel("Sustain %").fill("0");
  await form.getByRole("button", { name: "Save standard allocation" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("must add up to 100%");
});
