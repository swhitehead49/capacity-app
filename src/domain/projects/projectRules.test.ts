import { describe, expect, it } from "vitest";
import { projectIdFromName, projectInAddress, projectStorageName, validateProject } from "./projectRules";

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

// The first thing a user does is choose their project; next time the app opens that project again.
describe("projectInAddress", () => {
  it("reads the project from a web address inside a project", () => {
    expect(projectInAddress("/p/imaging")).toBe("imaging");
    expect(projectInAddress("/p/dx-2027/teams/T900/manage")).toBe("dx-2027");
  });

  it("is empty for other addresses and for IDs that can't be projects", () => {
    expect(projectInAddress("/")).toBeNull();
    expect(projectInAddress("/projects")).toBeNull();
    expect(projectInAddress("/p/Not%20Valid/teams")).toBeNull();
  });
});

// Creating a project (sean, 15 Nov 2026): you only type a name; the web-address ID is made from it.
describe("projectIdFromName", () => {
  it("makes a short web-address ID from the name", () => {
    expect(projectIdFromName("Cardiology Team", [])).toBe("cardiology-team");
    expect(projectIdFromName("  DX / Imaging 2027! ", [])).toBe("dx-imaging-2027");
  });

  it("starts with a letter and stays within 30 characters", () => {
    expect(projectIdFromName("2027 plan", [])).toBe("p-2027-plan");
    expect(projectIdFromName("A very long project name that keeps going and going", []).length).toBeLessThanOrEqual(30);
    expect(validateProject({ id: projectIdFromName("A very long project name that keeps going and going", []), name: "x" })).toEqual([]);
  });

  it("adds a number when the ID is already taken", () => {
    expect(projectIdFromName("Imaging", ["imaging"])).toBe("imaging-2");
    expect(projectIdFromName("Imaging", ["imaging", "imaging-2"])).toBe("imaging-3");
  });

  it("copes with a name that has no letters or digits", () => {
    expect(validateProject({ id: projectIdFromName("!!!", []), name: "!!!" })).toEqual([]);
  });
});
