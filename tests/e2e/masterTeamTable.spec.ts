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

test("delete a Provisional team from its Edit page", async ({ page }) => {
  await addMasterTeam(page, { id: "T702", name: "Grid Three" });
  await asRole(page, "admin");
  await page.goto("/reference/teams/T702");
  await page.getByRole("form", { name: "Delete team" }).getByRole("button", { name: "Delete team" }).click();
  await expect(page.getByRole("status")).toContainText("Deleted T702");
  await expect(page.getByLabel("Name of T702")).toHaveCount(0);
});

test("a team with members can't be deleted", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/T017");
  await page.getByRole("form", { name: "Delete team" }).getByRole("button", { name: "Delete team" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("retire it instead");
});
