import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { startAddress } from "@/src/domain/projects/projectRules";
import { getDb } from "@/src/infrastructure/db/appDb";
import { listProjects } from "@/src/infrastructure/db/projectDatabases";
import { PROJECT_COOKIE } from "@/app/lib/rememberedProject";

export const dynamic = "force-dynamic";

/** Opens the project you used last, or the project picker the first time. */
export default async function Start() {
  const remembered = (await cookies()).get(PROJECT_COOKIE)?.value;
  redirect(startAddress(remembered, await listProjects(await getDb())));
}
