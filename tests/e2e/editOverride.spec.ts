import { expect, test } from "@playwright/test";

// UC04: from the Team Planner, open a sprint's Edit form and set an override.
// Uses S002 so it doesn't affect the S001 checks in teamPlanner.spec.ts.

test("the Edit form shows what applies now", async ({ page }) => {
  await page.goto("/teams/T017");
  await page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S002/ }).getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "DRGW · S002" })).toBeVisible();
  await expect(page.getByText("Currently applied: Team default")).toBeVisible();
  await expect(page.getByLabel("Run %")).toHaveValue("30");
});

test("refuses a split that does not add up to 100%", async ({ page }) => {
  await page.goto("/teams/T017/periods/S002/edit");
  await page.getByLabel("Run %").fill("50");
  await page.getByLabel("Fix %").fill("20");
  await page.getByLabel("Sustain %").fill("10");
  await page.getByLabel("Change %").fill("10");
  await page.getByLabel("Reason").fill("Release sprint");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("Run + Fix + Sustain + Change must add up to 100%");
  await expect(page.getByLabel("Change %")).toHaveValue("10"); // what was typed is kept
  await expect(page.getByLabel("Reason")).toHaveValue("Release sprint");
});

test("saves an Active override and the planner shows it", async ({ page }) => {
  await page.goto("/teams/T017/periods/S002/edit");
  await page.getByLabel("Run %").fill("50");
  await page.getByLabel("Fix %").fill("20");
  await page.getByLabel("Sustain %").fill("10");
  await page.getByLabel("Change %").fill("20");
  await page.getByLabel("Status").selectOption("Active");
  await page.getByLabel("Reason").fill("Release sprint");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/teams\/T017$/);
  const s002 = page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S002/ });
  await expect(s002).toContainText("Sprint override");
  await expect(s002).toContainText("29.0"); // Run = 58.0 engineering days × 50%
});
