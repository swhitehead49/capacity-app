import { expect, test } from "@playwright/test";

// FR-19c (sean, 24 Nov 2026): Capacity summary for all teams, one value stream or one team, per sprint and quarter.
test("the Capacity summary shows all teams, one value stream or one team", async ({ page }) => {
  await page.goto("/p/default");
  await page.getByRole("banner").getByRole("link", { name: "Capacity summary" }).click();
  await expect(page.getByRole("heading", { name: /All teams/ })).toBeVisible();
  const sprints = page.getByRole("table", { name: "Sprints" });
  await expect(sprints.getByRole("row", { name: /^S001/ })).toBeVisible();
  const picker = page.getByRole("form", { name: "Show capacity for" });
  await picker.getByLabel("Show").selectOption("team");
  await picker.getByRole("combobox", { name: "Team", exact: true }).selectOption("T017");
  await picker.getByRole("button", { name: "Show" }).click();
  await expect(page.getByRole("heading", { name: /Team: DRGW/ })).toBeVisible();
  await expect(sprints.getByRole("row", { name: /^S001/ }).getByRole("cell").nth(2)).toHaveText("1");
});
