import { expect, test } from "@playwright/test";
import { asRole, linkValueStream } from "./helpers";

// UC15 add, UC16 rename, UC17 retire a team. Runs last; seed has T001, T002 (empty) and T017 DRGW.
// Master team list (sean, 15 Nov 2026): the Admin adds and edits teams in Reference data → Teams;
// a project's teams are those in its value streams. Retiring a team stays with the project.

test("the Teams page lists every team with its status", async ({ page }) => {
  await page.goto("/p/default");
  await page.getByRole("navigation").getByRole("link", { name: "Team planning" }).click();
  await expect(page.getByRole("heading", { name: "Team planning", exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T017/ })).toContainText("DRGW");
});

test("the Admin adds a team; a project with its value stream gets it", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  await page.getByRole("link", { name: "Add team" }).click();
  await page.getByLabel("Team ID").fill("T100");
  await page.getByLabel("Name").fill("Payments");
  await page.getByLabel("Value stream").selectOption("Platform");
  await page.getByLabel("Base location").selectOption("IN-KA");
  await page.getByLabel("Start date").fill("2026-11-09");
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page).toHaveURL(/\/reference\/teams$/);
  await expect(page.getByRole("table", { name: "Master team list" }).getByRole("row", { name: /T100/ })).toContainText("Payments");

  await asRole(page, "manager");
  await page.goto("/p/default/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T100/ })).toHaveCount(0);
  await linkValueStream(page, "default", "Platform");
  await page.goto("/p/default/teams");
  const row = page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T100/ });
  await expect(row).toContainText("Payments");
  await expect(row).toContainText("IN-KA"); // base location (sean, 15 Nov 2026)
});

test("Engineering managers see a team's details but can't edit them", async ({ page }) => {
  await page.goto("/p/default/teams/T100/manage");
  await expect(page.getByText("From the master team list")).toBeVisible();
  await expect(page.getByRole("form", { name: "Details" })).toHaveCount(0);
  await expect(page.getByRole("form", { name: "Rename" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add team" })).toHaveCount(0);
});

test("a team ID can't be used twice", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/new");
  await page.getByLabel("Team ID").fill("T017");
  await page.getByLabel("Name").fill("Another");
  await page.getByLabel("Start date").fill("2026-11-09");
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("Team ID T017 is already used");
  await expect(page.getByLabel("Name")).toHaveValue("Another");
});

test("rename a team and keep its old name in the history", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  await page.getByRole("row", { name: /T100/ }).getByRole("link", { name: "Edit" }).click();
  const form = page.getByRole("form", { name: "Rename" });
  await form.getByLabel("New name").fill("Payments & Billing");
  await form.getByLabel("From").fill("2026-12-01");
  await form.getByRole("button", { name: "Rename" }).click();
  await expect(page.getByRole("heading", { name: "Payments & Billing" })).toBeVisible();
  const history = page.getByRole("table", { name: "Name history" });
  await expect(history.getByRole("row", { name: /Payments & Billing/ })).toContainText("1 Dec 2026");
  await expect(history.getByRole("row", { name: /^Payments 9 Nov 2026/ })).toBeVisible();
});

test("a team with members can't be retired; the page says who to move", async ({ page }) => {
  await page.goto("/p/default/teams/T017/manage");
  const form = page.getByRole("form", { name: "Retire" });
  await form.getByLabel("Last day").fill("2026-12-31");
  await form.getByRole("button", { name: "Retire team" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("Move or end these members first: a@example.com");
});

test("retire an empty team and name its successor", async ({ page }) => {
  await page.goto("/p/default/teams/T002/manage");
  const form = page.getByRole("form", { name: "Retire" });
  await form.getByLabel("Last day").fill("2026-12-31");
  await form.getByLabel("Replaced by").selectOption({ label: "T100 | Payments & Billing" });
  await form.getByRole("button", { name: "Retire team" }).click();
  await expect(page.getByText("Retiring 31 Dec 2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "T100 | Payments & Billing" })).toBeVisible();
  await page.goto("/p/default/teams?choose=1");
  await expect(page.getByRole("row", { name: /T002/ })).toContainText("Retiring 31 Dec 2026");
});

test("move a team to another value stream", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/T001");
  const form = page.getByRole("form", { name: "Value stream" });
  await form.getByLabel("Value stream").selectOption("Clinical");
  await form.getByRole("button", { name: "Change value stream" }).click();
  await expect(page.getByText("T001 · Clinical")).toBeVisible();
});

test("filter the Teams list to one value stream", async ({ page }) => {
  await page.goto("/p/default/teams");
  await page.getByLabel("Show value stream").selectOption("Platform");
  await page.getByRole("button", { name: "Show" }).click();
  const table = page.getByRole("table", { name: "All teams" });
  await expect(table.getByRole("row", { name: /T100/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /T017/ })).toHaveCount(0);
});

test("the master team list shows each team's value stream; the project only its own", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams");
  await expect(page.getByRole("table", { name: "Master team list" }).getByRole("row", { name: /T001/ })).toContainText("Clinical");
  await asRole(page, "manager");
  await page.goto("/p/default/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T001/ })).toHaveCount(0); // Clinical isn't in Default
});

// sean, 15 Nov 2026: teams are grouped by value stream, and can be filtered by value stream and country.
test("teams are grouped under a heading row for each value stream", async ({ page }) => {
  await page.goto("/p/default/teams");
  const table = page.getByRole("table", { name: "All teams" });
  await expect(table.getByRole("row", { name: "Platform", exact: true })).toBeVisible();
  await expect(table.getByRole("row", { name: "No value stream", exact: true })).toBeVisible();
});

test("filter the teams by country (the country of their base location)", async ({ page }) => {
  await page.goto("/p/default/teams");
  await page.getByLabel("Country").selectOption("DE");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/country=DE/);
  const table = page.getByRole("table", { name: "All teams" });
  await expect(table.getByRole("row", { name: /T017/ })).toContainText("DE");
  await expect(table.getByRole("row", { name: /T002/ })).toHaveCount(0);
});

// sean, 15 Nov 2026: a team has its own base location; members keep their own country for public holidays.
test("the Admin changes a team's base location; projects see it", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/T100");
  const form = page.getByRole("form", { name: "Base location" });
  await form.getByLabel("Base location").selectOption("DE-BY");
  await form.getByRole("button", { name: "Change base location" }).click();
  await expect(page.getByText(/Based in DE-BY/)).toBeVisible();
  await asRole(page, "manager");
  await page.goto("/p/default/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T100/ })).toContainText("DE-BY");
});

test("a new member's location starts as the team's base location, and can be changed", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members/new");
  await expect(page.getByLabel("Location")).toHaveValue("DE-RP");
  await expect(page.getByText(/public holidays/)).toBeVisible();
});

// sean, 15 Nov 2026: teams carry the original workbook's attributes.
test("the Admin edits a team's details", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/teams/T100");
  const form = page.getByRole("form", { name: "Details" });
  await form.getByLabel("Parent team name", { exact: true }).fill("Clinical Services");
  await form.getByLabel("Top-level group", { exact: true }).fill("ORBIS");
  await form.getByLabel("Source headcount").fill("5");
  await form.getByLabel("ID status").selectOption("Confirmed");
  await form.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("form", { name: "Details" }).getByLabel("Parent team name", { exact: true })).toHaveValue("Clinical Services");
  await expect(page.getByRole("form", { name: "Details" }).getByLabel("ID status")).toHaveValue("Confirmed");
  await asRole(page, "manager");
  await page.goto("/p/default/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T100/ })).toContainText("Clinical Services");
});
