import { describe, expect, it } from "vitest";
import { projectStorageName, validateProject } from "./projectRules";

// Projects (decided 15 Nov 2026): project → value streams → teams. Each project's data is kept separate.

describe("validateProject", () => {
  it("accepts a short id and a name", () => {
    expect(validateProject({ id: "imaging", name: "Imaging" })).toEqual([]);
    expect(validateProject({ id: "dx-2027", name: "Diagnostics 2027" })).toEqual([]);
  });

  it("the id is lower-case letters, digits and dashes, 2 to 30 long (it becomes part of web addresses)", () => {
    const message = "Project ID must be 2–30 lower-case letters, digits or dashes, starting with a letter";
    expect(validateProject({ id: "Imaging", name: "x" })).toEqual([message]);
    expect(validateProject({ id: "a", name: "x" })).toEqual([message]);
    expect(validateProject({ id: "1abc", name: "x" })).toEqual([message]);
    expect(validateProject({ id: "has space", name: "x" })).toEqual([message]);
  });

  it("needs a name", () => {
    expect(validateProject({ id: "imaging", name: "  " })).toEqual(["Project name is needed"]);
  });
});

describe("projectStorageName", () => {
  it("gives each project its own Postgres schema name; Default keeps the original tables", () => {
    expect(projectStorageName("default")).toBe("public");
    expect(projectStorageName("dx-2027")).toBe("project_dx_2027");
  });
});
