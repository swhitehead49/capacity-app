import { describe, expect, it } from "vitest";
import { groupByValueStream, NO_VALUE_STREAM } from "./teamGroups";

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
