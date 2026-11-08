import { expect, test } from "@playwright/test";

// Decision Q4: India's holidays come from the company list, uploaded once a year as a CSV.
// The seed adds an India office (IN-KA) with no calendar loaded.

test("India shows as missing, to be uploaded as a CSV", async ({ page }) => {
  await page.goto("/holidays");
  const in2027 = page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /IN 2027/ });
  await expect(in2027).toContainText("CSV upload");
});

test("a CSV with mistakes lists each bad line and saves nothing", async ({ page }) => {
  await page.goto("/holidays");
  const form = page.getByRole("form", { name: "Upload a holiday list" });
  await form.getByLabel("Country").fill("IN");
  await form.getByLabel("Year").fill("2027");
  await form.getByLabel("CSV file").setInputFiles("tests/fixtures/holiday-csv/IN-2027-bad.csv");
  await form.getByRole("button", { name: "Upload" }).click();
  const alert = page.getByRole("alert", { name: "Problems loading" });
  await expect(alert).toContainText('Line 2: "2027-02-31" is not a real date');
  await expect(alert).toContainText("Line 3: 2026-12-25 is not in 2027");
  await expect(page.getByRole("table", { name: "Missing calendars" }).getByRole("row", { name: /IN 2027/ })).toBeVisible();
});

test("a good CSV loads the year", async ({ page }) => {
  await page.goto("/holidays");
  const form = page.getByRole("form", { name: "Upload a holiday list" });
  await form.getByLabel("Country").fill("IN");
  await form.getByLabel("Year").fill("2027");
  await form.getByLabel("CSV file").setInputFiles("tests/fixtures/holiday-csv/IN-2027.csv");
  await form.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByRole("status")).toHaveText("Loaded 3 public holidays for IN 2027.");
  const row = page.getByRole("table", { name: "Loaded calendars" }).getByRole("row", { name: /IN 2027/ });
  await expect(row).toContainText("CSV upload");
  await expect(row.getByRole("button", { name: "Reload" })).toHaveCount(0); // CSV years are replaced by uploading again
});
