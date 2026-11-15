import { expect, test } from "@playwright/test";

// Projects (decided 15 Nov 2026): every screen belongs to a project, shown in the web address.
// The test seed adds a second project, "imaging", with one team (T900 Imaging Core).

test("the first thing you do is choose your project", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Choose your project" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Default/ })).toBeVisible();
  await page.getByRole("link", { name: /Imaging/ }).click();
  await expect(page).toHaveURL(/\/p\/imaging\/teams$/);
  await expect(page.getByRole("banner")).toContainText("Imaging");
});

test("next time, the app opens the project you used last", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/imaging\/teams$/);
});

test("you can switch project from the top bar", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.getByRole("banner").getByRole("link", { name: "Switch project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("link", { name: /Default/ }).click();
  await expect(page).toHaveURL(/\/p\/default\/teams$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/default\/teams$/);
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

test("links and saves stay inside the project", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.getByRole("row", { name: /T900/ }).getByRole("link", { name: "Manage" }).click();
  await expect(page).toHaveURL(/\/p\/imaging\/teams\/T900\/manage$/);
  const form = page.getByRole("form", { name: "Value stream" });
  await form.getByLabel("Value stream").fill("Radiology");
  await form.getByRole("button", { name: "Change value stream" }).click();
  await expect(page).toHaveURL(/\/p\/imaging\/teams\/T900\/manage$/);
  await expect(page.getByText("T900 · Radiology")).toBeVisible();
});

test("an unknown project is not found", async ({ page }) => {
  const response = await page.goto("/p/no-such-project/teams");
  expect(response?.status()).toBe(404);
});

// Country holiday calendars live once, at the top level, and every project uses them (sean, 15 Nov 2026).
test("every project sees the same holiday calendars", async ({ page }) => {
  await page.goto("/p/imaging/holidays");
  await expect(page.getByText("shared by all projects")).toBeVisible();
  await expect(page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ })).toBeVisible();
});

// Projects, step 4 (sean, 15 Nov 2026): create, rename, archive and restore projects.
test("create a project from the picker; it opens on its empty Teams page", async ({ page }) => {
  await page.goto("/projects");
  const form = page.getByRole("form", { name: "New project" });
  await form.getByLabel("Project name").fill("Cardiology");
  await form.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/p\/cardiology\/teams$/);
  await expect(page.getByRole("banner")).toContainText("Cardiology");
  await expect(page.getByText("0 active of 0")).toBeVisible();
});

test("a project name that is already used is explained", async ({ page }) => {
  await page.goto("/projects");
  const form = page.getByRole("form", { name: "New project" });
  await form.getByLabel("Project name").fill("imaging");
  await form.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText('There is already a project called "Imaging"');
});

test("rename, archive and restore a project from its Settings page", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("form", { name: "New project" }).getByLabel("Project name").fill("Oncology");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.goto("/p/oncology/settings");
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
