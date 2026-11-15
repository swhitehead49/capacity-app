import { expect, type Page } from "@playwright/test";

export const asRole = (page: Page, role: "admin" | "manager") =>
  page.context().addCookies([{ name: "capacity-role", value: role, domain: "localhost", path: "/" }]);

/** Projects are added by the Admin on Reference data's Projects tab (sean, 15 Nov 2026). Leaves you as a manager. */
export async function createProject(page: Page, name: string) {
  await asRole(page, "admin");
  await page.goto("/reference/projects");
  await page.getByRole("form", { name: "New project" }).getByLabel("Project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("status")).toContainText(`Created ${name}`);
  await asRole(page, "manager");
}
