import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getTeamDetails } from "@/src/application/teams";
import { today } from "@/src/infrastructure/db/appDb";
import { projectDb } from "@/app/lib/project";
import { TeamTabs } from "./TeamTabs";

/** Team planning (sean, 16 Nov 2026): every page of a chosen team has its name and the tabs. */
export default async function TeamLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string; teamId: string }> }) {
  const { projectId, teamId } = await params;
  const { db } = await projectDb(projectId);
  const details = await getTeamDetails(db, { teamId, today: today() }).catch(() => null);
  if (!details) notFound();
  const { team, status } = details;
  return (
    <>
      <p className="muted"><Link href={`/p/${projectId}/teams?choose=1`}>Change team</Link></p>
      <h1>{team.name}</h1>
      <p className="muted">{team.id} · {team.valueStream ?? "no value stream"} · {status}</p>
      <TeamTabs base={`/p/${projectId}/teams/${team.id}`} />
      {children}
    </>
  );
}
