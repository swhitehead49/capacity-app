import { redirect } from "next/navigation";

/** Settings moved into the Reference data page (sean, 15 Nov 2026). Old links still land in the right place:
 *  visiting this address makes the project the current one, and Reference data shows its settings. */
export default async function ProjectSettings() {
  redirect("/reference");
}
