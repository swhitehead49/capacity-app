import { getSystemStandard } from "@/src/application/standardAllocation";
import { sharedDb } from "@/app/lib/project";
import { standardFormValues } from "@/app/lib/standardValues";
import { SystemStandardForm } from "./SystemStandardForm";

export const dynamic = "force-dynamic";

/** Reference data, Standard allocation tab (sean, 15 Nov 2026): the default every project uses until it sets its own. */
export default async function SystemStandardAllocation({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const system = await getSystemStandard(await sharedDb());
  return (
    <>
      <h2>Standard allocation</h2>
      <p className="muted">
        A new team starts with these percentages as its team default. Every project uses them until an Engineering manager
        sets the project&apos;s own under Project reference data. Changing them never changes existing teams.
        {!system && " Not set yet: until it is, new teams in projects without their own start with a Draft default."}
      </p>
      {saved && <p role="status" className="notice">Saved. Projects without their own standard will use this for new teams.</p>}
      <SystemStandardForm values={standardFormValues(system)} />
    </>
  );
}
