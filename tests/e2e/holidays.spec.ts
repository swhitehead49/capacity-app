import { expect, test } from "@playwright/test";

// FR-20 / BR-10: the Capacity Admin loads public holidays from OpenHolidays.
// The test server reads saved answers from tests/fixtures/openholidays, so no internet is needed.
// Seeded: German locations, and a DE 2026 calendar with only 2 holidays in it.

test("the Holidays page is in the top bar", async ({ page }) => {
  await page.goto("/p/default");
  await page.getByRole("link", { name: "Holidays" }).click();
  await expect(page.getByRole("heading", { name: "Public holidays" })).toBeVisible();
});

test("shows loaded calendars and the ones still missing", async ({ page }) => {
  await page.goto("/p/default/holidays");
  await expect(page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /DE 2027/ })).toBeVisible();
});

test("reloading a calendar fetches every holiday for that year", async ({ page }) => {
  await page.goto("/p/default/holidays");
  const de2026 = page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ });
  await de2026.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByRole("status")).toHaveText("Loaded 20 public holidays for DE 2026.");
  await expect(de2026).toContainText("DE-BY 13"); // each location's own total (sean, 15 Nov 2026)
  await expect(de2026).toContainText("DE-NI 10");
});

test("a failed load says why and changes nothing", async ({ page }) => {
  await page.goto("/p/default/holidays");
  const de2027 = page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /DE 2027/ });
  await de2027.getByRole("button", { name: "Load" }).click();
  await expect(page.getByRole("alert", { name: "Problems loading" })).toContainText("No saved OpenHolidays answer for DE 2027");
  await expect(page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /DE 2027/ })).toBeVisible();
});

// sean, 15 Nov 2026: add or remove single public holidays in a loaded calendar.
test("add a public holiday by hand, then remove it", async ({ page }) => {
  await page.goto("/p/default/holidays/DE/2026");
  const form = page.getByRole("form", { name: "Add a holiday" });
  await form.getByLabel("Date").fill("2026-07-01");
  await form.getByLabel("Name").fill("Company day");
  await form.getByLabel("DE-BY").check();
  await form.getByRole("button", { name: "Add holiday" }).click();
  const row = page.getByRole("table", { name: "Holidays" }).getByRole("row", { name: /Company day/ });
  await expect(row).toContainText("DE-BY");
  await expect(row).toContainText("Added by hand");
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("table", { name: "Holidays" }).getByRole("row", { name: /Company day/ })).toHaveCount(0);
});

test("remove a loaded holiday and put it back", async ({ page }) => {
  await page.goto("/p/default/holidays/DE/2026");
  await page.getByRole("table", { name: "Holidays" }).getByRole("row", { name: /Epiphany/ }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("table", { name: "Holidays" }).getByRole("row", { name: /Epiphany/ })).toHaveCount(0);
  const removed = page.getByRole("table", { name: "Removed holidays" }).getByRole("row", { name: /Epiphany/ });
  await removed.getByRole("button", { name: "Put back" }).click();
  await expect(page.getByRole("table", { name: "Holidays" }).getByRole("row", { name: /Epiphany/ })).toBeVisible();
});
