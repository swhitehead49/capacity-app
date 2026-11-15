import { expect, test } from "@playwright/test";

// UC01 Team Planner, as agreed 8 Nov 2026. The test server runs with today = 8 Nov 2026
// and a fresh database seeded with the DRGW pilot team (scripts/seed.ts).

// sean, 15 Nov 2026: the Teams page lists the project's teams.
test("the Teams page lists the project's teams; Planner opens a team", async ({ page }) => {
  await page.goto("/p/default");
  await page.getByRole("banner").getByRole("link", { name: "Teams" }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams$/);
  await page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T017/ }).getByRole("link", { name: "Planner" }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams\/T017$/);
  await expect(page.getByRole("heading", { name: "DRGW" })).toBeVisible();
});

test("shows 12 sprints and 5 quarters with the capacity already known", async ({ page }) => {
  await page.goto("/p/default/teams/T017");

  const sprints = page.getByRole("table", { name: "Sprints" });
  await expect(sprints.getByRole("row")).toHaveCount(13); // header + 12
  const s001 = sprints.getByRole("row", { name: /S001/ });
  await expect(s001).toContainText("26 Oct 2026");
  await expect(s001).toContainText("72.5"); // available person-days
  await expect(s001).toContainText("58.0"); // engineering person-days
  await expect(s001).toContainText("Team default");

  const quarters = page.getByRole("table", { name: "Quarters" });
  await expect(quarters.getByRole("row")).toHaveCount(6); // header + 5
  await expect(quarters.getByRole("row", { name: /2027-Q2/ })).toContainText("Provisional");
});

test("every period has an Edit link to its override", async ({ page }) => {
  await page.goto("/p/default/teams/T017");
  const edit = page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S001/ }).getByRole("link", { name: "Edit" });
  await expect(edit).toHaveAttribute("href", "/p/default/teams/T017/periods/S001/edit");
});
