import { describe, expect, it } from "vitest";
import { filterTeams, groupByValueStream, hierarchyOptions, NO_VALUE_STREAM } from "./teamGroups";

// sean, 15 Nov 2026: a project's teams are listed grouped by value stream.

describe("groupByValueStream", () => {
  it("groups teams under their value stream, A–Z, with teams that have none last", () => {
    const teams = [
      { id: "T3", valueStream: null },
      { id: "T1", valueStream: "Radiology" },
      { id: "T2", valueStream: "Clinical" },
      { id: "T4", valueStream: "Radiology" },
    ];
    expect(groupByValueStream(teams)).toEqual([
      ["Clinical", [{ id: "T2", valueStream: "Clinical" }]],
      ["Radiology", [{ id: "T1", valueStream: "Radiology" }, { id: "T4", valueStream: "Radiology" }]],
      [NO_VALUE_STREAM, [{ id: "T3", valueStream: null }]],
    ]);
  });

  it("is empty when there are no teams", () => {
    expect(groupByValueStream([])).toEqual([]);
  });
});

// sean, 22 Nov 2026: filter the master team table by Team Name, Parent Team Name and Grandparent Team Name.
describe("filterTeams", () => {
  const teams = [
    { name: "Nursing", parentTeamName: "Regular Care", grandparentTeamName: "ORBIS Engineering Vienna" },
    { name: "Nursing-Mission", parentTeamName: null, grandparentTeamName: null },
    { name: "PAS", parentTeamName: "R&D ORBIS 4", grandparentTeamName: "ORBIS Engineering Trier" },
  ];

  it("Team Name matches part of the name, any case; parent and grandparent match exactly", () => {
    expect(filterTeams(teams, { name: "nurs" }).map((x) => x.name)).toEqual(["Nursing", "Nursing-Mission"]);
    expect(filterTeams(teams, { parent: "R&D ORBIS 4" }).map((x) => x.name)).toEqual(["PAS"]);
    expect(filterTeams(teams, { name: "nurs", grandparent: "ORBIS Engineering Vienna" }).map((x) => x.name)).toEqual(["Nursing"]);
    expect(filterTeams(teams, {})).toHaveLength(3);
  });

  it("lists the parent and grandparent names to pick from, A–Z, without blanks or repeats", () => {
    expect(hierarchyOptions(teams)).toEqual({
      parents: ["R&D ORBIS 4", "Regular Care"],
      grandparents: ["ORBIS Engineering Trier", "ORBIS Engineering Vienna"],
    });
  });
});
