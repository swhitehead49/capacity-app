import { expect, test } from "@playwright/test";

// UC09 / FR-07: a person's own leave, separate from public holidays (sean, 15 Nov 2026).
// Uses DRGW sprint S010 (March 2027) so other planner tests are not affected.

test("book leave for a team member; the planner takes it off; cancel it", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members");
  const row = page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /a@example.com/ });
  await row.getByRole("link", { name: "Leave" }).click();
  await expect(page.getByRole("heading", { name: /Leave/ })).toBeVisible();

  await page.goto("/p/default/teams/T017");
  const s010 = page.getByRole("table", { name: "Sprints" }).getByRole("row", { name: /S010/ });
  const before = Number(await s010.getByRole("cell").nth(3).innerText());
  await page.goBack();

  const form = page.getByRole("form", { name: "Book leave" });
  await form.getByLabel("From").fill("2027-03-01");
  await form.getByLabel("To").fill("2027-03-12");
  await form.getByLabel("Type").selectOption("Annual leave");
  await form.getByRole("button", { name: "Book leave" }).click();
  const booked = page.getByRole("table", { name: "Leave" }).getByRole("row", { name: /1 Mar 2027/ });
  await expect(booked).toContainText("Booked");

  await page.goto("/p/default/teams/T017");
  expect(Number(await s010.getByRole("cell").nth(3).innerText())).toBeLessThan(before);
  await page.goBack();

  await booked.getByRole("button", { name: "Cancel leave" }).click();
  await expect(booked).toContainText("Cancelled");
});

test("leave that ends before it starts is explained", async ({ page }) => {
  await page.goto("/p/default/teams/T017/members");
  await page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /a@example.com/ }).getByRole("link", { name: "Leave" }).click();
  const form = page.getByRole("form", { name: "Book leave" });
  await form.getByLabel("From").fill("2027-03-10");
  await form.getByLabel("To").fill("2027-03-01");
  await form.getByRole("button", { name: "Book leave" }).click();
  await expect(page.getByRole("alert", { name: "Problems saving" })).toContainText("End date can't be before the start date");
});
