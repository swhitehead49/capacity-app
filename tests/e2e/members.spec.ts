import { expect, test } from "@playwright/test";

// UC06 review and UC07 add / edit / end / move team members. Seed: T017 DRGW with a–j@example.com,
// T001 Example Team A with nobody. Changes here are dated after sprint S001, so the planner tests still hold.

test("the planner links to the team's members", async ({ page }) => {
  await page.goto("/teams/T017");
  await page.getByRole("link", { name: "Team members" }).click();
  await expect(page.getByRole("heading", { name: "DRGW members" })).toBeVisible();
  const current = page.getByRole("table", { name: "Current members" });
  await expect(current.getByRole("row")).toHaveCount(11); // header + 10
  await expect(current.getByRole("row", { name: /b@example\.com/ })).toContainText("90");
  await expect(current.getByRole("row", { name: /f@example\.com/ })).toContainText("Missing contracted hours");
});

test("add a new person to a team", async ({ page }) => {
  await page.goto("/teams/T001/members");
  await page.getByRole("link", { name: "Add member" }).click();
  await page.getByLabel("Email").fill("new.person@example.com");
  await page.getByLabel("Team %").fill("50");
  await page.getByLabel("Start date").fill("2026-11-09");
  await page.getByLabel("Location").selectOption("DE-BY");
  await page.getByLabel("Contracted hours").fill("40");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page).toHaveURL(/\/teams\/T001\/members$/);
  const row = page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /new\.person@example\.com/ });
  await expect(row).toContainText("50");
  await expect(row).toContainText("Complete");
});

test("a mistake on the add form is explained and what was typed is kept", async ({ page }) => {
  await page.goto("/teams/T001/members/new");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Team %").fill("150");
  await page.getByLabel("Start date").fill("2026-11-09");
  await page.getByRole("button", { name: "Add member" }).click();
  const alert = page.getByRole("alert", { name: "Problems saving" });
  await expect(alert).toContainText("Email must look like name@company.com");
  await expect(alert).toContainText("Team % must be more than 0 and at most 100");
  await expect(page.getByLabel("Email")).toHaveValue("not-an-email");
});

test("edit a member's details", async ({ page }) => {
  await page.goto("/teams/T001/members");
  await page.getByRole("row", { name: /new\.person@example\.com/ }).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Contracted hours").fill("32");
  await page.getByLabel("Shared resource").check();
  await page.getByRole("button", { name: "Save" }).click();
  const row = page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /new\.person@example\.com/ });
  await expect(row).toContainText("32");
  await expect(row).toContainText("Shared");
});

test("end a membership", async ({ page }) => {
  await page.goto("/teams/T017/members");
  await page.getByRole("row", { name: /j@example\.com/ }).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Last day on the team").fill("2026-11-30");
  await page.getByRole("button", { name: "End membership" }).click();
  await expect(page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /j@example\.com/ }))
    .toContainText("30 Nov 2026");
});

test("move a member to another team", async ({ page }) => {
  await page.goto("/teams/T017/members");
  await page.getByRole("row", { name: /h@example\.com/ }).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Move to team").selectOption({ label: "T001 | Example Team A" });
  await page.getByLabel("First day on the new team").fill("2026-12-01");
  await page.getByRole("button", { name: "Move" }).click();
  await expect(page).toHaveURL(/\/teams\/T001\/members$/);
  await expect(page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /h@example\.com/ }))
    .toContainText("1 Dec 2026");
  await page.goto("/teams/T017/members");
  await expect(page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /h@example\.com/ }))
    .toContainText("30 Nov 2026");
});
