import { getReferenceData } from "@/src/application/referenceData";
import { sharedDb } from "@/app/lib/project";
import { AddValueStreamForm } from "./ReferenceForms";

export const dynamic = "force-dynamic";

/** Reference data, Value streams tab (sean, 15 Nov 2026): the list every project picks its value streams from. */
export default async function ValueStreams() {
  const { valueStreams } = await getReferenceData(await sharedDb());
  return (
    <>
      <h2>Value streams</h2>
      <p className="muted">Each project picks its value streams from this list.</p>
      <table className="members narrow">
        <caption>Value streams</caption>
        <thead><tr><th>Name</th></tr></thead>
        <tbody>
          {valueStreams.length === 0 && <tr><td className="empty">None yet.</td></tr>}
          {valueStreams.map((v) => <tr key={v}><td>{v}</td></tr>)}
        </tbody>
      </table>
      <AddValueStreamForm />
    </>
  );
}
