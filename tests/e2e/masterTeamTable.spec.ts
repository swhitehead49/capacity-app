import { expect, test } from "@playwright/test";
import { addMasterTeam, asRole } from "./helpers";

// sean, 16 Nov 2026: while the team list is provisional, the Admin edits the core values in the table
// (value stream and base location as drop-downs), and can delete a Provisional team that nothing uses yet.

test("edit teams in the master list's table and save them together", async ({ page }) => {
  await addMasterTeam(page, { id: "T700", name: "Grid One" });
  await addMasterTeam(page, { id: "T701", name: "Grid Two" });
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  const form = page.getByRole("form", { name: "Edit teams" });
  await form.getByLabel("Name of T700").fill("Grid One Renamed");
  await form.getByLabel("Value stream of T700").selectOption("Platform");
  await form.getByLabel("Base location of T701").selectOption("DE-BY");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved changes to 2 teams");
  await expect(page.getByLabel("Name of T700")).toHaveValue("Grid One Renamed");
  await expect(page.getByLabel("Value stream of T700")).toHaveValue("Platform");
  await expect(page.getByLabel("Base location of T701")).toHaveValue("DE-BY");
});

// FR-18o (sean, 22 Nov 2026): each team can have a team type, set in the table or on the team's Edit page.
test("set a team's type in the master list's table", async ({ page }) => {
  await addMasterTeam(page, { id: "T790", name: "Grid Typed" });
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  const form = page.getByRole("form", { name: "Edit teams" });
  await form.getByLabel("Team type of T790").selectOption("Mission Team");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved changes to 1 team");
  await expect(page.getByLabel("Team type of T790")).toHaveValue("Mission Team");
  await page.goto("/reference/teams/T790");
  await expect(page.getByLabel("Team type")).toHaveValue("Mission Team");
});

// sean, 16 Nov 2026: deleting asks for confirmation first.
test("delete a Provisional team from its row, after confirming", async ({ page }) => {
  await addMasterTeam(page, { id: "T702", name: "Grid Three" });
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  await page.getByRole("link", { name: "Delete T702" }).click();
  await expect(page.getByRole("heading", { name: "Delete T702 Grid Three?" })).toBeVisible();
  await page.getByRole("link", { name: "Cancel, keep the team" }).click();
  await expect(page.getByLabel("Name of T702")).toHaveValue("Grid Three");

  await page.getByRole("link", { name: "Delete T702" }).click();
  await page.getByRole("button", { name: "Yes, delete T702" }).click();
  await expect(page.getByRole("status")).toContainText("Deleted T702");
  await expect(page.getByLabel("Name of T702")).toHaveCount(0);
});

test("a team with members can't be deleted", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/T017");
  await page.getByRole("link", { name: "Delete team", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete T017" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("retire it instead");
});

// sean, 16 Nov 2026: "hard delete of team DRGW and all associated data".
test("delete a team and all its data, after typing its ID", async ({ page }) => {
  await addMasterTeam(page, { id: "T704", name: "Grid Five" });
  await asRole(page, "admin");
  await page.goto("/reference/teams/T704");
  await page.getByRole("link", { name: "Delete team and all its data" }).click();
  await expect(page.getByRole("table", { name: "What will be deleted" }).getByRole("row", { name: /^Default/ })).toBeVisible();
  const form = page.getByRole("form", { name: "Delete team and all its data" });
  await form.getByLabel("Type T704 to confirm").fill("T7");
  await form.getByRole("button", { name: "Delete team and all its data" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("Type T704 to confirm");
  await page.getByRole("form", { name: "Delete team and all its data" }).getByLabel("Type T704 to confirm").fill("T704");
  await page.getByRole("form", { name: "Delete team and all its data" }).getByRole("button", { name: "Delete team and all its data" }).click();
  await expect(page.getByRole("status")).toContainText("Deleted T704");
  await expect(page.getByLabel("Name of T704")).toHaveCount(0);
});
