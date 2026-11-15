import type { ReactNode } from "react";
import { TopBar } from "@/app/lib/TopBar";

/** Reference data, shared by every project: value streams, locations and public holidays (sean, 15 Nov 2026). */
export default function ReferenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main>{children}</main>
    </>
  );
}
