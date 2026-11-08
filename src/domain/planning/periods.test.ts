import { describe, expect, it } from "vitest";
import { generateQuarters, generateSprints, planningHorizon } from "./periods";

// FR-08: generate sprints and quarters.
// Team Planner horizon (agreed 8 Nov 2026): sprints from the current one to the end of next quarter;
// quarters from the current one to the end of next calendar year.

const sprints = generateSprints({ firstStart: "2026-10-26", lengthDays: 14, count: 52, prefix: "S" });
const quarters = generateQuarters({ from: "2026-10-01", count: 12 });

describe("generateSprints", () => {
  it("numbers sprints and makes them 14 days long", () => {
    expect(sprints[0]).toEqual({ id: "S001", type: "Sprint", start: "2026-10-26", end: "2026-11-08", parentId: "2026-Q4" });
    expect(sprints[1]).toMatchObject({ id: "S002", start: "2026-11-09", end: "2026-11-22" });
  });

  it("links each sprint to the quarter it starts in", () => {
    expect(sprints.find((s) => s.start === "2027-01-04")?.parentId).toBe("2027-Q1");
  });
});

describe("generateQuarters", () => {
  it("makes calendar quarters", () => {
    expect(quarters[0]).toEqual({ id: "2026-Q4", type: "Quarter", start: "2026-10-01", end: "2026-12-31", parentId: null });
    expect(quarters[1]).toMatchObject({ id: "2027-Q1", start: "2027-01-01", end: "2027-03-31" });
  });
});

describe("planningHorizon on 8 Nov 2026", () => {
  const horizon = planningHorizon("2026-11-08", [...quarters, ...sprints]);

  it("starts with the current sprint", () => {
    expect(horizon.sprints[0]?.id).toBe("S001");
  });

  it("runs sprints to the end of next quarter (31 Mar 2027), including one that starts before it ends", () => {
    const last = horizon.sprints.at(-1);
    expect(last?.id).toBe("S012"); // 29 Mar – 11 Apr 2027
    expect(horizon.sprints).toHaveLength(12);
  });

  it("shows quarters from now to the end of next year", () => {
    expect(horizon.quarters.map((q) => q.id)).toEqual(["2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3", "2027-Q4"]);
  });

  it("drops finished sprints", () => {
    const later = planningHorizon("2026-11-20", [...quarters, ...sprints]);
    expect(later.sprints[0]?.id).toBe("S002");
  });
});
