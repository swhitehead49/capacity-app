import { expect, test } from "@playwright/test";

// sean, 15 Nov 2026: value streams and locations are reference data set once at system level, for every project.

test("add a value stream and a location on the Reference data page, then use them in a project", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: "Reference data" }).click();
  await expect(page).toHaveURL(/\/reference$/);

  const streams = page.getByRole("form", { name: "Add value stream" });
  await streams.getByLabel("Name").fill("Oncology");
  await streams.getByRole("button", { name: "Add value stream" }).click();
  await expect(page.getByRole("table", { name: "Value streams" })).toContainText("Oncology");

  const places = page.getByRole("form", { name: "Add location" });
  await places.getByLabel("Code").fill("FR-NAQ");
  await places.getByLabel("Country").fill("FR");
  await places.getByLabel("Name").fill("Bordeaux");
  await places.getByLabel("Standard hours").fill("35");
  await places.getByRole("button", { name: "Add location" }).click();
  await expect(page.getByRole("table", { name: "Locations" }).getByRole("row", { name: /FR-NAQ/ })).toContainText("Bordeaux");

  // Another project can pick them straight away.
  await page.goto("/p/imaging/teams/new");
  await page.getByLabel("Team ID").fill("T901");
  await page.getByLabel("Name").fill("Imaging Oncology");
  await page.getByLabel("Value stream").selectOption("Oncology");
  await page.getByLabel("Base location").selectOption("FR-NAQ");
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T901/ })).toContainText("FR-NAQ");
});

test("a value stream that is already there is refused", async ({ page }) => {
  await page.goto("/reference");
  const streams = page.getByRole("form", { name: "Add value stream" });
  await streams.getByLabel("Name").fill("platform");
  await streams.getByRole("button", { name: "Add value stream" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText('"platform" is already a value stream');
});
