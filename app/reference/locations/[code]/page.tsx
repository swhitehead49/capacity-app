import { TopBar } from "@/app/lib/TopBar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReferenceData } from "@/src/application/referenceData";
import { sharedDb } from "@/app/lib/project";
import { EditLocationForm } from "../../ReferenceForms";

export const dynamic = "force-dynamic";

/** Edit a location's name and standard hours (sean, 15 Nov 2026). Every project sees the change. */
export default async function EditLocation({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const location = (await getReferenceData(await sharedDb())).locations.find((l) => l.code === decodeURIComponent(code));
  if (!location) notFound();
  return (
    <>
      <TopBar />
      <main>
        <p className="muted"><Link href="/reference">← Reference data</Link></p>
        <h1>{location.code}</h1>
        <p className="muted">Country {location.country}. The code and country can&apos;t change, because people&apos;s public holidays depend on them.</p>
        <EditLocationForm code={location.code} values={{ name: location.name, standardHours: location.standardHours === null ? "" : String(location.standardHours) }} />
      </main>
    </>
  );
}
