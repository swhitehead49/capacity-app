import { describe, expect, it } from "vitest";
import { accessFor, parseRole } from "./roles";

// sean, 15 Nov 2026: the app opens on a home screen that asks who you are.
// An Admin goes to Reference data; an Engineering manager chooses a project and never sees Reference data.
// This is a choice, not a login: personal logins come later.

describe("parseRole", () => {
  it("knows the two roles", () => {
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("manager")).toBe("manager");
    expect(parseRole("boss")).toBeNull();
    expect(parseRole(undefined)).toBeNull();
  });
});

describe("accessFor", () => {
  it("keeps an Admin out of a project's Project reference data (sean, 15 Nov 2026)", () => {
    expect(accessFor("admin", "/p/imaging/project-reference")).toEqual({ allowed: false, goTo: "/reference" });
    expect(accessFor("manager", "/p/imaging/project-reference")).toEqual({ allowed: true });
  });

  it("anyone can open the home screen", () => {
    expect(accessFor(null, "/")).toEqual({ allowed: true });
    expect(accessFor("manager", "/")).toEqual({ allowed: true });
  });

  it("sends someone who hasn't said who they are to the home screen", () => {
    expect(accessFor(null, "/projects")).toEqual({ allowed: false, goTo: "/" });
    expect(accessFor(null, "/p/default/teams")).toEqual({ allowed: false, goTo: "/" });
  });

  it("keeps an Engineering manager out of Reference data", () => {
    expect(accessFor("manager", "/reference")).toEqual({ allowed: false, goTo: "/projects" });
    expect(accessFor("manager", "/reference/public-holidays/DE/2026")).toEqual({ allowed: false, goTo: "/projects" });
    expect(accessFor("manager", "/referenced")).toEqual({ allowed: true });
  });

  it("an Engineering manager can use projects and their teams", () => {
    expect(accessFor("manager", "/projects")).toEqual({ allowed: true });
    expect(accessFor("manager", "/p/imaging/teams/T900")).toEqual({ allowed: true });
  });

  it("an Admin can go everywhere", () => {
    expect(accessFor("admin", "/reference/locations/DE-BY")).toEqual({ allowed: true });
    expect(accessFor("admin", "/p/default/teams")).toEqual({ allowed: true });
  });
});
