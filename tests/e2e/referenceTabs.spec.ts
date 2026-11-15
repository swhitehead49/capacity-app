import { expect, test } from "@playwright/test";

// sean, 15 Nov 2026: Reference data has a tab for each section, plus a Sprint calendar tab.
test.use({ storageState: "tests/e2e/admin-role.json" });

test("Reference data has a tab for each section", async ({ page }) => {
  await page.goto("/reference");
  const tabs = page.getByRole("navigation", { name: "Reference data sections" });
  await expect(tabs.getByRole("link")).toHaveText(["Value streams", "Locations", "Public holidays", "Sprint calendar"]);
  await expect(tabs.getByRole("link", { name: "Value streams" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("table", { name: "Value streams" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Locations" })).toHaveCount(0);

  await tabs.getByRole("link", { name: "Locations" }).click();
  await expect(page).toHaveURL(/\/reference\/locations$/);
  await expect(page.getByRole("table", { name: "Locations" })).toBeVisible();

  await tabs.getByRole("link", { name: "Public holidays" }).click();
  await expect(page.getByRole("heading", { name: "Public holidays" })).toBeVisible();
});

test("the Sprint calendar tab shows the shared calendar and its sprints", async ({ page }) => {
  await page.goto("/reference");
  await page.getByRole("navigation", { name: "Reference data sections" }).getByRole("link", { name: "Sprint calendar" }).click();
  await expect(page).toHaveURL(/\/reference\/sprint-calendar$/);
  await expect(page.getByText("First sprint starts 26 Oct 2026")).toBeVisible();
  const s001 = page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S001/ });
  await expect(s001).toContainText("26 Oct 2026");
  await expect(s001).toContainText("Current"); // the test server's today is 8 Nov 2026
});
