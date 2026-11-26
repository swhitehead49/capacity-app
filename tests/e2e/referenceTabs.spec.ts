import { expect, test } from "@playwright/test";
import { createProject } from "./helpers";

// sean, 15 Nov 2026: Reference data has a tab for each section, plus a Sprint calendar tab.
test.use({ storageState: "tests/e2e/admin-role.json" });

test("Reference data has a tab for each section", async ({ page }) => {
  await page.goto("/reference");
  const tabs = page.getByRole("navigation", { name: "Reference data sections" });
  await expect(tabs.getByRole("link")).toHaveText(["Value streams", "Teams", "Locations", "Public holidays", "Sprint calendar", "Standard allocation", "Projects"]);
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

// sean, 15 Nov 2026: "can we extend the sprint calendar to Q4 2029".
test("extend the sprint calendar to a later quarter", async ({ page }) => {
  await page.goto("/reference/sprint-calendar");
  const form = page.getByRole("form", { name: "Extend calendar" });
  await form.getByLabel("Extend calendar to").selectOption("2029-Q4");
  await form.getByRole("button", { name: "Extend calendar" }).click();
  await expect(page.getByRole("status")).toContainText("now runs to the end of 2029-Q4");
  await expect(page.getByRole("table", { name: "Quarters" }).getByRole("row").last()).toContainText("2029-Q4");
});

// sean, 15 Nov 2026: a system standard allocation that projects use until they set their own.
test("set the system standard allocation; a project without its own uses it", async ({ page }) => {
  await page.goto("/reference");
  await page.getByRole("navigation", { name: "Reference data sections" }).getByRole("link", { name: "Standard allocation" }).click();
  await expect(page).toHaveURL(/\/reference\/standard-allocation$/);
  const form = page.getByRole("form", { name: "Standard allocation" });
  for (const [label, value] of [["Organisational %", "10"], ["Unplanned %", "0"], ["Maintenance %", "50"], ["Technical improvements %", "20"], ["Change %", "20"], ["Enabling/Training %", "0"]]) {
    await form.getByLabel(label).fill(value);
  }
  await form.getByRole("button", { name: "Save standard allocation" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  await createProject(page, "Uses System");
  await page.goto("/p/uses-system/project-reference");
  await expect(page.getByText("Using the system standard allocation")).toBeVisible();
});
