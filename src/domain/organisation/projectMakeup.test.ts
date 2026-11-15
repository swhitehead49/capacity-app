import { describe, expect, it } from "vitest";
import { projectMakeup } from "./projectMakeup";

// sean, 15 Nov 2026: the project home page shows the project's makeup: the value streams linked to it
// (through its teams). With none, it says "No value streams in the project".

const team = (id: string, valueStream: string | null, members: number, status = "Active") => ({ id, valueStream, members, status });

describe("projectMakeup", () => {
  it("lists each value stream with its active teams and current members, A–Z", () => {
    const makeup = projectMakeup([team("T1", "Radiology", 5), team("T2", "Clinical", 3), team("T3", "Radiology", 4)]);
    expect(makeup).toEqual({
      valueStreams: [
        { name: "Clinical", teams: 1, members: 3 },
        { name: "Radiology", teams: 2, members: 9 },
      ],
      teamsWithoutValueStream: 0,
      error: null,
    });
  });

  it("leaves out retired teams", () => {
    expect(projectMakeup([team("T1", "Radiology", 0, "Retired 31 Oct 2026"), team("T2", "Clinical", 2)]).valueStreams.map((v) => v.name))
      .toEqual(["Clinical"]);
  });

  it("counts active teams that have no value stream", () => {
    expect(projectMakeup([team("T1", "Clinical", 2), team("T2", null, 1)]).teamsWithoutValueStream).toBe(1);
  });

  it('says "No value streams in the project" when no active team has one', () => {
    expect(projectMakeup([team("T1", null, 2)]).error).toBe("No value streams in the project");
    expect(projectMakeup([]).error).toBe("No value streams in the project");
  });
});
