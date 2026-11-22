import { expect, test } from "@playwright/test";

// FR-05b (sean, 22 Nov 2026): import team members from the Team Members sheet saved as CSV.
const csv = (text: string) => ({ name: "members.csv", mimeType: "text/csv", buffer: Buffer.from(text) });

test("import team members from Team planning; problems stop the whole file", async ({ page }) => {
  await page.goto("/p/default/teams?choose=1");
  await page.getByRole("link", { name: "Import team members from spreadsheet" }).click();
  const form = page.getByRole("form", { name: "Import team members" });

  await form.getByLabel("CSV file").setInputFiles(csv("Team_ID,Email\nT017,imported.one@example.com\nT999,nobody@example.com\n"));
  await form.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("alert", { name: "Problems importing" })).toContainText("Line 3: T999 is not one of this project's teams");

  await form.getByLabel("CSV file").setInputFiles(csv("Team_ID,Email,First_Name,Last_Name,Team_Pct\nT017,imported.one@example.com,Imported,One,50\n"));
  await form.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("status")).toContainText("Imported 1 team member");

  await page.goto("/p/default/teams/T017/members");
  await expect(page.getByRole("table", { name: "Current members" }).getByRole("row", { name: /imported.one@example.com/ })).toContainText("Imported One");
});
