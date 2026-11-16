"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The tabs of a chosen team (sean, 16 Nov 2026). Team members is where choosing a team lands. */
export function TeamTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `${base}/members`, label: "Team members", match: pathname.startsWith(`${base}/members`) },
    { href: base, label: "Capacity", match: pathname === base || pathname.startsWith(`${base}/default`) || pathname.startsWith(`${base}/periods`) },
    { href: `${base}/manage`, label: "Team details", match: pathname.startsWith(`${base}/manage`) },
  ];
  return (
    <nav className="tabs" aria-label="Team sections">
      {tabs.map((tab) => <Link key={tab.label} href={tab.href} aria-current={tab.match ? "page" : undefined}>{tab.label}</Link>)}
    </nav>
  );
}
