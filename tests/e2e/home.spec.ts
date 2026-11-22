import { expect, test } from "@playwright/test";
import { addMasterTeam, asRole, createProject, linkValueStream } from "./helpers";

// sean, 15 Nov 2026: the app opens on a home screen with no menu that asks who you are.
// These tests start with no role chosen (the other specs run as an Admin).
test.use({ storageState: { cookies: [], origins: [] } });

test("the home screen has no menu and asks who you are", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Capacity App" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Admin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Engineering manager" })).toBeVisible();
});

test("any other page sends you to the home screen until you choose", async ({ page }) => {
  await page.goto("/p/default/teams");
  await expect(page).toHaveURL(/\/$/);
});

test("an Admin goes to Reference data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/reference$/);
  await expect(page.getByRole("heading", { name: "Reference data" })).toBeVisible();
});

test("an Engineering manager chooses a project, lands on its home page, and never sees Reference data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Engineering manager" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Choose your project" })).toBeVisible();
  await page.getByRole("list", { name: "Projects" }).getByRole("link", { name: /Imaging/ }).click();
  await expect(page).toHaveURL(/\/p\/imaging$/);
  await expect(page.getByRole("heading", { name: "Imaging" })).toBeVisible();

  const bar = page.getByRole("banner");
  await expect(bar.getByRole("link", { name: "Reference data", exact: true })).toHaveCount(0);
  await expect(bar.getByRole("link", { name: "Team planning" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Project reference data" })).toBeVisible();

  await page.goto("/reference");
  await expect(page).toHaveURL(/\/projects$/);
});

test("Capacity App in the top bar goes back to the home screen, to choose again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Engineering manager" }).click();
  await page.getByRole("banner").getByRole("link", { name: "Capacity App" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/reference$/);
});

// sean, 15 Nov 2026: the project home page shows the project's makeup.
test("the project home page shows the value streams in the project, or an error when there are none", async ({ page }) => {
  await page.context().addCookies([{ name: "capacity-role", value: "manager", domain: "localhost", path: "/" }]);
  await createProject(page, "Makeup Test");
  await page.goto("/p/makeup-test");
  await expect(page.getByRole("alert")).toHaveText("No value streams in the project");

  // Master team list (sean, 15 Nov 2026): the Admin adds the team; the project gets it through its value stream.
  await addMasterTeam(page, { id: "T500", name: "Viewer", valueStream: "Radiology" });
  await linkValueStream(page, "makeup-test", "Radiology");
  await page.goto("/p/makeup-test");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Value streams in this project" }).getByRole("row", { name: /Radiology/ })).toContainText("1");
  await page.goto("/p/makeup-test/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T500/ })).toContainText("Viewer");
});

// FR-18s (sean, 22 Nov 2026): the Admin sets up a project in Reference data → Projects: tick value streams (and so their
// teams), then tick or untick single teams. The manager's Project home shows the result, read-only.
test("the Admin ticks a value stream into a project, and leaves out a single team", async ({ page }) => {
  await linkValueStream(page, "imaging", "Clinical");
  await page.goto("/p/imaging");
  await expect(page.getByRole("button", { name: /Remove|Exclude|Include|Add value stream/ })).toHaveCount(0); // read-only for managers
  await page.getByRole("table", { name: "Value streams in this project" }).getByRole("link", { name: "Clinical" }).click();
  await expect(page.getByRole("heading", { name: "Clinical" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Teams in Clinical" })).toBeVisible();

  await page.goto("/p/imaging");
  await expect(page.getByRole("table", { name: "Other teams in this project" }).getByRole("row", { name: /T900/ })).toBeVisible();
  await asRole(page, "admin");
  await page.goto("/reference/projects");
  await page.getByRole("link", { name: "Set up Imaging" }).click();
  const teams = page.getByRole("form", { name: "Teams in the project" });
  await teams.getByLabel("Include T900", { exact: true }).uncheck();
  await teams.getByRole("button", { name: "Update teams" }).click();
  await expect(page.getByRole("status")).toContainText("Updated 1 team");
  await expect(page.getByRole("form", { name: "Teams in the project" }).getByLabel("Include T900", { exact: true })).not.toBeChecked();
  await asRole(page, "manager");
  await page.goto("/p/imaging");
  await expect(page.getByRole("table", { name: "Other teams in this project" }).getByRole("row", { name: /T900/ })).toHaveCount(0);

  await asRole(page, "admin");
  await page.goto("/reference/projects/imaging");
  await page.getByRole("form", { name: "Teams in the project" }).getByLabel("Include T900", { exact: true }).check();
  await page.getByRole("form", { name: "Teams in the project" }).getByRole("button", { name: "Update teams" }).click();
  await expect(page.getByRole("status")).toContainText("Updated 1 team");
});

test("unticking a value stream takes its teams out of the project", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/projects/makeup-test");
  const streams = page.getByRole("form", { name: "Value streams in the project" });
  await streams.getByLabel("Include Radiology", { exact: true }).uncheck();
  await streams.getByRole("button", { name: "Update value streams" }).click();
  await expect(page.getByRole("status")).toContainText("Removed Radiology");
  await asRole(page, "manager");
  await page.goto("/p/makeup-test");
  await expect(page.getByRole("table", { name: "Value streams in this project" })).toHaveCount(0);
  await page.goto("/p/makeup-test/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T500/ })).toHaveCount(0);
});
