import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb } from "../src/infrastructure/db/appDb";
import * as t from "../src/infrastructure/db/schema";

export const dynamic = "force-dynamic";

async function openPlanner(formData: FormData) {
  "use server";
  redirect(`/teams/${encodeURIComponent(String(formData.get("team")))}`);
}

/** Home: pick a team (UC01, step 1). */
export default async function Home() {
  const db = await getDb();
  const teams = await db.select().from(t.teams).orderBy(asc(t.teams.id));
  return (
    <>
      <h1>Team Planner</h1>
      <p className="muted">Choose a team to see its capacity by sprint and quarter.</p>
      <form className="picker" action={openPlanner}>
        <label>
          Team
          <select name="team" required defaultValue="">
            <option value="" disabled>Select a team…</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{`${team.id} | ${team.name}`}</option>
            ))}
          </select>
        </label>
        <button type="submit">Open planner</button>
      </form>
    </>
  );
}
