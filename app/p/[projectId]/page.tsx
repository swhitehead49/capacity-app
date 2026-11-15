import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { projectDb } from "@/app/lib/project";
import * as t from "@/src/infrastructure/db/schema";

export const dynamic = "force-dynamic";

async function openPlanner(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  redirect(`/p/${projectId}/teams/${encodeURIComponent(String(formData.get("team")))}`);
}

/** Home: pick a team (UC01, step 1). */
export default async function Home({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const db = (await projectDb(projectId)).db;
  const teams = await db.select().from(t.teams).orderBy(asc(t.teams.id));
  return (
    <>
      <h1>Team Planner</h1>
      <p className="muted">Choose a team to see its capacity by sprint and quarter.</p>
      <form className="picker" action={openPlanner}>
        <input type="hidden" name="projectId" value={projectId} />
        <label>
          Team
          <select name="team" required defaultValue="">
            <option value="" disabled>Select a team…</option>
            {groupByValueStream(teams).map(([stream, group]) => (
              <optgroup key={stream} label={stream}>
                {group.map((team) => (
                  <option key={team.id} value={team.id}>{`${team.id} | ${team.name}${team.retiredOn ? " (retired)" : ""}`}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="submit">Open planner</button>
      </form>
    </>
  );
}

/** Teams grouped under their value stream (A–Z), with teams that have none last. */
function groupByValueStream<T extends { valueStream: string | null }>(teams: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const team of teams) {
    const key = team.valueStream ?? "No value stream";
    groups.set(key, [...(groups.get(key) ?? []), team]);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === "No value stream" ? 1 : b === "No value stream" ? -1 : a.localeCompare(b));
}
