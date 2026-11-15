import { TopBar } from "@/app/lib/TopBar";
import Link from "next/link";
import { STARTING_LOCATIONS, getReferenceData } from "@/src/application/referenceData";
import { sharedDb } from "@/app/lib/project";
import { addStartingLocationsAction } from "./actions";
import { AddLocationForm, AddValueStreamForm } from "./ReferenceForms";

export const dynamic = "force-dynamic";

/** Reference data set once for the whole system and used by every project (sean, 15 Nov 2026). */
export default async function ReferenceData() {
  const { valueStreams, locations } = await getReferenceData(await sharedDb());
  const missing = STARTING_LOCATIONS.filter((s) => !locations.some((l) => l.code === s.code));
  return (
    <>
      <TopBar />
      <main>
        <h1>Reference data</h1>
        <p className="muted">Set once for the whole system and shared by every project. A team&apos;s value stream and base location,
          and each person&apos;s location, are picked from these lists.</p>

        <h2>Value streams</h2>
        <table className="members narrow">
          <caption>Value streams</caption>
          <thead><tr><th>Name</th></tr></thead>
          <tbody>
            {valueStreams.length === 0 && <tr><td className="empty">None yet.</td></tr>}
            {valueStreams.map((v) => <tr key={v}><td>{v}</td></tr>)}
          </tbody>
        </table>
        <AddValueStreamForm />

        <h2>Locations</h2>
        <p className="muted">The code is the ISO region code (such as DE-BY), or the country code alone for a whole country.
          It decides which public holidays apply to the people there.</p>
        <table className="members narrow">
          <caption>Locations</caption>
          <thead><tr><th>Code</th><th>Country</th><th>Name</th><th>Standard hours</th><th></th></tr></thead>
          <tbody>
            {locations.length === 0 && <tr><td colSpan={5} className="empty">None yet.</td></tr>}
            {locations.map((l) => <tr key={l.code}><td>{l.code}</td><td>{l.country}</td><td>{l.name}</td><td>{l.standardHours ?? ""}</td><td><Link className="edit" href={`/reference/locations/${l.code}`}>Edit</Link></td></tr>)}
          </tbody>
        </table>
        {missing.length > 0 && (
          <form action={addStartingLocationsAction} className="upload">
            <p className="muted">The original workbook&apos;s locations not here yet: {missing.map((l) => l.code).join(", ")}.</p>
            <button type="submit" className="secondary">Add the starting locations</button>
          </form>
        )}
        <AddLocationForm />
      </main>
    </>
  );
}
