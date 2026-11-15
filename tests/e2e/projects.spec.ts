import { expect, test } from "@playwright/test";

// Projects (decided 15 Nov 2026): every screen belongs to a project, shown in the web address.
// The test seed adds a second project, "imaging", with one team (T900 Imaging Core).

test("the first thing you do is choose your project", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Choose your project" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Default/ })).toBeVisible();
  await page.getByRole("link", { name: /Imaging/ }).click();
  await expect(page).toHaveURL(/\/p\/imaging$/);
  await expect(page.getByRole("banner")).toContainText("Imaging");
});

test("next time, the app opens the project you used last", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/imaging$/);
});

test("you can switch project from the top bar", async ({ page }) => {
  await page.goto("/p/imaging/teams");
  await page.getByRole("banner").getByRole("link", { name: "Switch project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("link", { name: /Default/ }).click();
  await expect(page).toHaveURL(/\/p\/default$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/p\/default$/);
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
