import { expect, test } from "@playwright/test";
import { addMasterTeam, linkValueStream } from "./helpers";

// Standard allocation (sean, 15 Nov 2026): each project's default work allocations, adopted by new teams.
// Uses the Imaging project so the Default project's teams are not affected.
// sean, 15 Nov 2026: it is on Project reference data, which only Engineering managers see.
test.use({ storageState: "tests/e2e/manager-role.json" });

test("set the project's standard allocation; a new team starts with it", async ({ page }) => {
  await page.goto("/p/imaging");
  await page.getByRole("banner").getByRole("link", { name: "Project reference data" }).click();
  await expect(page).toHaveURL(/\/p\/imaging\/project-reference$/);
  await expect(page.getByRole("heading", { name: "Standard allocation for new teams" })).toBeVisible();
  const form = page.getByRole("form", { name: "Standard allocation" });
  await form.getByLabel("Organisational %").fill("20");
  await form.getByLabel("Unplanned %").fill("5");
  await form.getByLabel("Maintenance %").fill("35");
  await form.getByLabel("Technical improvements %").fill("10");
  await form.getByLabel("Change %").fill("20");
  await form.getByLabel("Enabling/Training %").fill("10");
  await form.getByRole("button", { name: "Save standard allocation" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  // Master team list (sean, 15 Nov 2026): the Admin adds the team; Imaging gets it through its Diagnostics value stream.
  await addMasterTeam(page, { id: "T901", name: "Imaging Viewer", valueStream: "Diagnostics" });
  await linkValueStream(page, "imaging", "Diagnostics");
  await page.goto("/p/imaging/teams/T901/default");
  await expect(page.getByRole("region", { name: "In force today" }))
    .toContainText("Organisational 20% · Unplanned 5% · Maintenance 35% · Technical improvements 10% · Change 20% · Enabling/Training 10%");
});

test("a standard allocation that doesn't add up is explained", async ({ page }) => {
  await page.goto("/p/imaging/project-reference");
  const form = page.getByRole("form", { name: "Standard allocation" });
  await form.getByLabel("Organisational %").fill("20");
  await form.getByLabel("Maintenance %").fill("50");
  await form.getByLabel("Change %").fill("40");
  await form.getByLabel("Enabling/Training %").fill("0");
  await form.getByLabel("Technical improvements %").fill("0");
  await form.getByRole("button", { name: "Save standard allocation" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("must add up to 100%");
});
