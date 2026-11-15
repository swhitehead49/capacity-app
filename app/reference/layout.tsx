import type { ReactNode } from "react";
import { TopBar } from "@/app/lib/TopBar";
import { ReferenceTabs } from "./ReferenceTabs";

/** Reference data, shared by every project (sean, 15 Nov 2026), with a tab for each section. */
export default function ReferenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main>
        <h1>Reference data</h1>
        <p className="muted">Set once by the Admin and shared by every project.</p>
        <ReferenceTabs />
        {children}
      </main>
    </>
  );
}
