import { expect, test } from "@playwright/test";

// FR-20 / UC10 (requested 8 Nov 2026): view a loaded holiday calendar.
// Seeded DE 2026 calendar has two holidays: Reformation Day (DE-NI, Sat 31 Oct) and All Saints' Day (DE-BY and others, Sun 1 Nov).

test("open a loaded calendar from the Holidays page", async ({ page }) => {
  await page.goto("/holidays");
  await page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /DE 2026/ }).getByRole("link", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "DE 2026 public holidays" })).toBeVisible();
  const table = page.getByRole("table", { name: "Holidays" });
  await expect(table.getByRole("row")).toHaveCount(3); // header + 2
  await expect(table.getByRole("row", { name: /Reformation Day/ })).toContainText("Sat");
  await expect(table.getByRole("row", { name: /Reformation Day/ })).toContainText("DE-NI");
});

test("filter the calendar to one region", async ({ page }) => {
  await page.goto("/holidays/DE/2026");
  await page.getByLabel("Region").selectOption("DE-BY");
  await page.getByRole("button", { name: "Show" }).click();
  const table = page.getByRole("table", { name: "Holidays" });
  await expect(table.getByRole("row", { name: /All Saints/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Reformation Day/ })).toHaveCount(0);
});
