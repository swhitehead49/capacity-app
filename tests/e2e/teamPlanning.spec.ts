import { expect, test } from "@playwright/test";

// Team planning (sean, 16 Nov 2026): an Engineering manager first chooses their team; the team's pages then have tabs
// for Team members (the default), Capacity and Team details. The app remembers the chosen team.

test("choose your team from Team planning; it opens on its Team members tab", async ({ page }) => {
  await page.goto("/p/default");
  await page.getByRole("banner").getByRole("link", { name: "Team planning" }).click();
  await expect(page.getByRole("heading", { name: "Team planning" })).toBeVisible();
  await expect(page.getByText("Choose your team")).toBeVisible();
  await page.getByRole("table", { name: "All teams" }).getByRole("link", { name: "DRGW" }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams\/T017\/members$/);
  await expect(page.getByRole("heading", { name: "DRGW", level: 1 })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Team sections" });
  await expect(tabs.getByRole("link")).toHaveText(["Team members", "Capacity", "Team details"]);
  await expect(tabs.getByRole("link", { name: "Team members" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("table", { name: "Current members" })).toBeVisible();
});

test("the chosen team is remembered; Change team goes back to the list", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members");
  await page.goto("/p/default/teams");
  await expect(page).toHaveURL(/\/p\/default\/teams\/T017\/members$/);
  await page.getByRole("link", { name: "Change team" }).click();
  await expect(page.getByText("Choose your team")).toBeVisible();
});

test("the Capacity tab shows sprints and quarters, the team default and edit by period", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members");
  await page.getByRole("navigation", { name: "Team sections" }).getByRole("link", { name: "Capacity" }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams\/T017$/);
  await expect(page.getByRole("table", { name: /Sprints/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Quarters/ })).toBeVisible();
  await page.getByRole("link", { name: "Team default" }).click();
  await expect(page.getByRole("navigation", { name: "Team sections" }).getByRole("link", { name: "Capacity" }))
    .toHaveAttribute("aria-current", "page");
});

test("the Team details tab shows the details read-only and can retire the team", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members");
  await page.getByRole("navigation", { name: "Team sections" }).getByRole("link", { name: "Team details" }).click();
  await expect(page.getByText("From the master team list")).toBeVisible();
  await expect(page.getByRole("form", { name: "Retire" })).toBeVisible();
});

test("on Team members you can add, edit, end or move members, and book their leave", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members");
  await expect(page.getByRole("link", { name: "Add member" })).toBeVisible();
  const row = page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /a@example.com/ });
  await expect(row.getByRole("link", { name: "Leave" })).toBeVisible();
  await row.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "End membership" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Move to another team" })).toBeVisible();
  await expect(page.getByLabel("Location")).toBeVisible(); // decides the person's public holidays
});
