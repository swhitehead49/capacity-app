import { expect, test } from "@playwright/test";
import { addMasterTeam, createProject, linkValueStream } from "./helpers";

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
  await expect(bar.getByRole("link", { name: "Teams" })).toBeVisible();
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

// sean, 15 Nov 2026: a project's value streams decide its teams; teams without one can be included or excluded.
test("add a value stream to a project, see its teams, and exclude a team without a value stream", async ({ page }) => {
  await page.context().addCookies([{ name: "capacity-role", value: "manager", domain: "localhost", path: "/" }]);
  await linkValueStream(page, "imaging", "Clinical");
  await page.getByRole("table", { name: "Value streams in this project" }).getByRole("link", { name: "Clinical" }).click();
  await expect(page.getByRole("heading", { name: "Clinical" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Teams in Clinical" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Add teams" })).toHaveCount(0); // the Admin sets a team's value stream

  await page.goto("/p/imaging");
  const unmapped = page.getByRole("table", { name: "Teams without a value stream" }).getByRole("row", { name: /T900/ });
  await expect(unmapped).toContainText("Included");
  await unmapped.getByRole("button", { name: "Exclude" }).click();
  await expect(page.getByRole("table", { name: "Teams without a value stream" }).getByRole("row", { name: /T900/ })).toContainText("Excluded");
  await unmapped.getByRole("button", { name: "Include" }).click();
  await expect(page.getByRole("table", { name: "Teams without a value stream" }).getByRole("row", { name: /T900/ })).toContainText("Included");
});

test("removing a value stream takes its teams out of the project", async ({ page }) => {
  await page.context().addCookies([{ name: "capacity-role", value: "manager", domain: "localhost", path: "/" }]);
  await page.goto("/p/makeup-test");
  await page.getByRole("table", { name: "Value streams in this project" }).getByRole("row", { name: /Radiology/ }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("table", { name: "Value streams in this project" })).toHaveCount(0);
  await page.goto("/p/makeup-test/teams");
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T500/ })).toHaveCount(0);
});
