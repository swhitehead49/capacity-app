import { expect, test } from "@playwright/test";

// FR-20 / BR-10: the Capacity Admin loads public holidays from OpenHolidays.
// The test server reads saved answers from tests/fixtures/openholidays, so no internet is needed.
// Seeded: German locations, and a DE 2026 calendar with only 2 holidays in it.

test("the Holidays page is in the top bar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Holidays" }).click();
  await expect(page.getByRole("heading", { name: "Public holidays" })).toBeVisible();
});

test("shows loaded calendars and the ones still missing", async ({ page }) => {
  await page.goto("/holidays");
  await expect(page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /DE 2027/ })).toBeVisible();
});

test("reloading a calendar fetches every holiday for that year", async ({ page }) => {
  await page.goto("/holidays");
  const de2026 = page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ });
  await de2026.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByRole("status")).toHaveText("Loaded 20 public holidays for DE 2026.");
  await expect(de2026).toContainText("20");
});

test("a failed load says why and changes nothing", async ({ page }) => {
  await page.goto("/holidays");
  const de2027 = page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /DE 2027/ });
  await de2027.getByRole("button", { name: "Load" }).click();
  await expect(page.getByRole("alert", { name: "Problems loading" })).toContainText("No saved OpenHolidays answer for DE 2027");
  await expect(page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /DE 2027/ })).toBeVisible();
});
