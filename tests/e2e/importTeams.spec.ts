import { expect, test } from "@playwright/test";
import { asRole } from "./helpers";

// Import teams from a spreadsheet saved as CSV (sean, 15 Nov 2026), into the master team list (Admin).

const csv = (text: string) => ({ name: "teams.csv", mimeType: "text/csv", buffer: Buffer.from(text) });

test("import teams from a CSV file on the Teams tab", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  await page.getByRole("link", { name: "Import from spreadsheet" }).click();
  const form = page.getByRole("form", { name: "Import teams" });
  await form.getByLabel("CSV file").setInputFiles(csv("team_id,name,value_stream\nT950,Imaging Reports,Radiology\nT951,Imaging Archive,Radiology\n"));
  await form.getByRole("button", { name: "Import" }).click();
  await expect(page).toHaveURL(/\/reference\/teams\?/);
  await expect(page.getByRole("status")).toContainText("Imported 2 teams");
  await expect(page.getByLabel("Name of T950")).toHaveValue("Imaging Reports");
  await expect(page.getByLabel("Value stream of T951")).toHaveValue("Radiology");
});

test("a file with problems lists them and imports nothing", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/import");
  const form = page.getByRole("form", { name: "Import teams" });
  await form.getByLabel("CSV file").setInputFiles(csv("team_id,name\nT960,Good team\nT960,Same ID\n"));
  await form.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("alert", { name: "Problems importing" })).toContainText("Line 3: Team ID T960 is also on line 2");
  await page.goto("/reference/teams");
  await expect(page.getByRole("row", { name: /T960/ })).toHaveCount(0);
});
