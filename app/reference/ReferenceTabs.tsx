"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A tab for each part of Reference data (sean, 15 Nov 2026). */
const TABS = [
  { href: "/reference", label: "Value streams", match: (p: string) => p === "/reference" },
  { href: "/reference/teams", label: "Teams", match: (p: string) => p.startsWith("/reference/teams") },
  { href: "/reference/locations", label: "Locations", match: (p: string) => p.startsWith("/reference/locations") },
  { href: "/reference/public-holidays", label: "Public holidays", match: (p: string) => p.startsWith("/reference/public-holidays") },
  { href: "/reference/sprint-calendar", label: "Sprint calendar", match: (p: string) => p.startsWith("/reference/sprint-calendar") },
  { href: "/reference/standard-allocation", label: "Standard allocation", match: (p: string) => p.startsWith("/reference/standard-allocation") },
  { href: "/reference/projects", label: "Projects", match: (p: string) => p.startsWith("/reference/projects") },
];

export function ReferenceTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Reference data sections">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.match(pathname) ? "page" : undefined}>{tab.label}</Link>
      ))}
    </nav>
  );
}
