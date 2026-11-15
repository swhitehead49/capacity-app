import { expect, test } from "@playwright/test";

// Reference data is the Admin side (sean, 15 Nov 2026).
test.use({ storageState: "tests/e2e/admin-role.json" });

// sean, 15 Nov 2026: value streams and locations are reference data set once at system level, for every project.

test("add a value stream and a location on the Reference data page, then use them in a project", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/reference$/);

  const streams = page.getByRole("form", { name: "Add value stream" });
  await streams.getByLabel("Name").fill("Oncology");
  await streams.getByRole("button", { name: "Add value stream" }).click();
  await expect(page.getByRole("table", { name: "Value streams" })).toContainText("Oncology");

  const places = page.getByRole("form", { name: "Add location" });
  await places.getByLabel("Code").fill("ES-MD");
  await places.getByLabel("Country").fill("ES");
  await places.getByLabel("Name").fill("Madrid");
  await places.getByLabel("Standard hours").fill("35");
  await places.getByRole("button", { name: "Add location" }).click();
  await expect(page.getByRole("table", { name: "Locations" }).getByRole("row", { name: /ES-MD/ })).toContainText("Madrid");
  await expect(page.getByRole("table", { name: "Locations" }).getByRole("row", { name: /ES-MD/ })).toContainText("35");

  // An Engineering manager can pick them straight away in any project.
  await page.context().addCookies([{ name: "capacity-role", value: "manager", domain: "localhost", path: "/" }]);
  await page.goto("/p/imaging/teams/new");
  await page.getByLabel("Team ID").fill("T902");
  await page.getByLabel("Name").fill("Imaging Oncology");
  await page.getByLabel("Value stream").selectOption("Oncology");
  await page.getByLabel("Base location").selectOption("ES-MD");
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByRole("table", { name: "All teams" }).getByRole("row", { name: /T902/ })).toContainText("ES-MD");
});

test("a value stream that is already there is refused", async ({ page }) => {
  await page.goto("/reference");
  const streams = page.getByRole("form", { name: "Add value stream" });
  await streams.getByLabel("Name").fill("platform");
  await streams.getByRole("button", { name: "Add value stream" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText('"platform" is already a value stream');
});

test("add the original workbook's locations in one go", async ({ page }) => {
  await page.goto("/reference");
  await page.getByRole("button", { name: "Add the starting locations" }).click();
  const locations = page.getByRole("table", { name: "Locations" });
  await expect(locations.getByRole("row", { name: /AT-9/ })).toContainText("Vienna");
  await expect(locations.getByRole("row", { name: /BE-VOV/ })).toContainText("Ghent");
  await expect(page.getByRole("button", { name: "Add the starting locations" })).toHaveCount(0);
});

test("edit a location's name and standard hours", async ({ page }) => {
  await page.goto("/reference");
  await page.getByRole("table", { name: "Locations" }).getByRole("row", { name: /AT-9/ }).getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/reference\/locations\/AT-9$/);
  const form = page.getByRole("form", { name: "Edit location" });
  await form.getByLabel("Name").fill("Vienna office");
  await form.getByLabel("Standard hours").fill("38.5");
  await form.getByRole("button", { name: "Save location" }).click();
  await expect(page).toHaveURL(/\/reference$/);
  await expect(page.getByRole("table", { name: "Locations" }).getByRole("row", { name: /AT-9/ })).toContainText("Vienna office");
  await expect(page.getByRole("table", { name: "Locations" }).getByRole("row", { name: /AT-9/ })).toContainText("38.5");
});
