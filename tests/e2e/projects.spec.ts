import { expect, test } from "@playwright/test";
import { asRole, createProject } from "./helpers";

// Projects (decided 15 Nov 2026): every screen belongs to a project, shown in the web address.
// The test seed adds a second project, "imaging", with one team (T900 Imaging Core).

test("you can switch project from the top bar", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.getByRole("banner").getByRole("link", { name: "Switch project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("link", { name: /Default/ }).click();
  await expect(page).toHaveURL(/\/p\/default$/);
  await expect(page.getByRole("banner")).toContainText("Default");
});

test("the top bar shows which project you are in", async ({ page }) => {
  await page.goto("/p/default/teams");
  await expect(page.getByRole("banner")).toContainText("Default");
});

test("each project only shows its own teams", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  const teams = page.getByRole("table", { name: "All teams" });
  await expect(teams.getByRole("row", { name: /T900/ })).toContainText("Imaging Core");
  await expect(teams.getByRole("row", { name: /T017/ })).toHaveCount(0);
  await expect(page.getByRole("banner")).toContainText("Imaging");
});

test("links stay inside the project", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.getByRole("row", { name: /T900/ }).getByRole("link", { name: "Imaging Core" }).click();
  await expect(page).toHaveURL(/\/p\/imaging\/teams\/T900\/members$/);
  await expect(page.getByRole("heading", { name: "Imaging Core" })).toBeVisible();
});

test("an unknown project is not found", async ({ page }) => {
  const response = await page.goto("/p/no-such-project/teams");
  expect(response?.status()).toBe(404);
});

// Country holiday calendars live once, at the top level, and every project uses them (sean, 15 Nov 2026).
test("every project sees the same holiday calendars", async ({ page }) => {
  await page.context().addCookies([{ name: "capacity-role", value: "admin", domain: "localhost", path: "/" }]);
  await page.goto("/reference/public-holidays");
  await expect(page.getByText("shared by all projects")).toBeVisible();
  await expect(page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ })).toBeVisible();
});

// Projects, step 4 (sean, 15 Nov 2026): create, rename, archive and restore projects.
// sean, 15 Nov 2026: adding a project moved to a Projects tab in (system) Reference data, for the Admin.
test("an Admin adds a project on the Projects tab; managers then find it, empty", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference");
  await page.getByRole("navigation", { name: "Reference data sections" }).getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/reference\/projects$/);
  await expect(page.getByRole("table", { name: "Projects" }).getByRole("row", { name: /Imaging/ })).toBeVisible();
  const form = page.getByRole("form", { name: "New project" });
  await form.getByLabel("Project name").fill("Cardiology");
  await form.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("status")).toContainText("Created Cardiology");
  // FR-18s: straight on to its setup, where nothing is ticked yet.
  await expect(page.getByRole("heading", { name: "Set up Cardiology" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Value streams in the project" }).getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(page.getByRole("form", { name: "Teams in the project" }).getByRole("checkbox", { checked: true })).toHaveCount(0);
  await page.getByRole("link", { name: "← Projects" }).click();
  await expect(page.getByRole("table", { name: "Projects" }).getByRole("row", { name: /Cardiology/ })).toBeVisible();

  await asRole(page, "manager");
  await page.goto("/projects");
  await page.getByRole("list", { name: "Projects" }).getByRole("link", { name: /Cardiology/ }).click();
  await expect(page.getByRole("banner")).toContainText("Cardiology");
  await page.goto("/p/cardiology/teams");
  await expect(page.getByText("0 active of 0")).toBeVisible();
});

test("Engineering managers can't add projects", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("form", { name: "New project" })).toHaveCount(0);
});

test("a project name that is already used is explained", async ({ page }) => {
  await asRole(page, "admin");
  await page.goto("/reference/projects");
  const form = page.getByRole("form", { name: "New project" });
  await form.getByLabel("Project name").fill("imaging");
  await form.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText('There is already a project called "Imaging"');
});

const asManager = (page: import("@playwright/test").Page) =>
  page.context().addCookies([{ name: "capacity-role", value: "manager", domain: "localhost", path: "/" }]);

test("rename, archive and restore a project from its Project reference data", async ({ page }) => {
  await createProject(page, "Oncology");
  await page.goto("/p/oncology/teams");
  await page.getByRole("banner").getByRole("link", { name: "Project reference data" }).click();
  const rename = page.getByRole("form", { name: "Rename project" });
  await rename.getByLabel("Project name").fill("Oncology Services");
  await rename.getByRole("button", { name: "Rename" }).click();
  await expect(page.getByRole("banner")).toContainText("Oncology Services");

  await page.getByRole("button", { name: "Archive project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("list", { name: "Projects" }).getByRole("link", { name: /Oncology/ })).toHaveCount(0);
  const archived = page.getByRole("table", { name: "Archived projects" }).getByRole("row", { name: /Oncology Services/ });
  await archived.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("list", { name: "Projects" }).getByRole("link", { name: /Oncology Services/ })).toBeVisible();
});

// sean, 15 Nov 2026: the menu across the top is the same on every page (per role), with a way back to the project home.
test("every Engineering manager page has the same top menu", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  for (const address of ["/p/imaging", "/p/imaging/teams", "/p/imaging/project-reference", "/projects"]) {
    await page.goto(address);
    const bar = page.getByRole("banner");
    await expect(bar.getByRole("link")).toHaveText(["Capacity App", "Project home", "Team planning", "Project reference data", "Switch project"]);
    await expect(bar.getByRole("link", { name: "Project home" })).toHaveAttribute("href", "/p/imaging");
    await expect(bar).toContainText("Imaging");
    await expect(bar.getByRole("link", { name: "Team planning" })).toHaveAttribute("href", "/p/imaging/teams");
  }
});

test("the Admin side is project-agnostic: only Reference data, and no project pages", async ({ page }) => {
  await page.context().addCookies([{ name: "capacity-role", value: "admin", domain: "localhost", path: "/" }]);
  for (const address of ["/reference", "/reference/public-holidays", "/reference/locations/DE-BY"]) {
    await page.goto(address);
    await expect(page.getByRole("banner").getByRole("link")).toHaveText(["Capacity App", "Reference data"]);
    await expect(page.getByRole("banner")).not.toContainText("Imaging");
  }
  for (const address of ["/p/imaging/teams", "/projects", "/p/imaging/project-reference"]) {
    await page.goto(address);
    await expect(page).toHaveURL(/\/reference$/);
  }
});

test("an old Settings link opens the project's Project reference data", async ({ page }) => {
  await asManager(page);
  await page.goto("/p/imaging/settings");
  await expect(page).toHaveURL(/\/p\/imaging\/project-reference$/);
  await expect(page.getByRole("heading", { name: "Standard allocation for new teams" })).toBeVisible();
});

