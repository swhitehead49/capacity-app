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

// Requested 8 Nov 2026: show the team default read-only, and revert one or all periods to it.

async function saveOverride(page: import("@playwright/test").Page, periodId: string) {
  await page.goto(`/teams/T017/periods/${periodId}/edit`);
  await page.getByLabel("Run %").fill("50");
  await page.getByLabel("Fix %").fill("20");
  await page.getByLabel("Sustain %").fill("10");
  await page.getByLabel("Change %").fill("20");
  await page.getByLabel("Status").selectOption("Active");
  await page.getByLabel("Reason").fill("Test override");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/teams\/T017$/);
}

const sprintRow = (page: import("@playwright/test").Page, id: string) =>
  page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: new RegExp(id) });

test("shows the team default read-only for reference", async ({ page }) => {
  await page.goto("/teams/T017/periods/S004/edit");
  const panel = page.getByRole("region", { name: "Team default (read only)" });
  await expect(panel).toContainText("Overhead 20%");
  await expect(panel).toContainText("Run 30%");
  await expect(panel).toContainText("Change 30%");
});

test("reverts one period to the team default", async ({ page }) => {
  await saveOverride(page, "S004");
  await expect(sprintRow(page, "S004")).toContainText("Sprint override");

  await page.goto("/teams/T017/periods/S004/edit");
  await page.getByRole("button", { name: "Revert this period to default" }).click();
  await expect(page).toHaveURL(/\/teams\/T017$/);
  await expect(sprintRow(page, "S004")).toContainText("Team default");
});

test("reverts all periods to the team default after confirming", async ({ page }) => {
  await saveOverride(page, "S005");
  await saveOverride(page, "S006");

  await page.goto("/teams/T017/periods/S005/edit");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Revert all periods to default" }).click();
  await expect(page).toHaveURL(/\/teams\/T017$/);
  await expect(sprintRow(page, "S005")).toContainText("Team default");
  await expect(sprintRow(page, "S006")).toContainText("Team default");
});
