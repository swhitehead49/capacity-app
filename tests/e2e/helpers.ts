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

/** The Admin adds a team to the master team list (sean, 15 Nov 2026). Leaves you as a manager. */
export async function addMasterTeam(page: Page, team: { id: string; name: string; valueStream?: string; baseLocation?: string }) {
  await asRole(page, "admin");
  await page.goto("/reference/teams/new");
  const form = page.getByRole("form", { name: "Add team" });
  await form.getByLabel("Team ID").fill(team.id);
  await form.getByLabel("Name").fill(team.name);
  if (team.valueStream) await form.getByLabel("Value stream").selectOption(team.valueStream);
  if (team.baseLocation) await form.getByLabel("Base location").selectOption(team.baseLocation);
  await form.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByLabel(`Name of ${team.id}`)).toHaveValue(team.name);
  await asRole(page, "manager");
}

/** FR-18s: the Admin ticks a value stream (and so its teams) into a project on Reference data → Projects. Leaves you as a manager. */
export async function linkValueStream(page: Page, projectId: string, valueStream: string) {
  await asRole(page, "admin");
  await page.goto(`/reference/projects/${projectId}`);
  const form = page.getByRole("form", { name: "Value streams in the project" });
  await form.getByLabel(`Include ${valueStream}`, { exact: true }).check();
  await form.getByRole("button", { name: "Update value streams" }).click();
  await expect(page.getByRole("status")).toContainText(`Added ${valueStream}`);
  await asRole(page, "manager");
}
