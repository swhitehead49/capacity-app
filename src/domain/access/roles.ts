// Who is using the app (sean, 15 Nov 2026). The home screen asks; the answer is remembered in a cookie.
// This is a choice, not a login: anyone can pick either until personal logins come later.

export type Role = "admin" | "manager";
export const ROLE_LABELS: Record<Role, string> = { admin: "Admin", manager: "Engineering manager" };

export function parseRole(value: string | undefined | null): Role | null {
  return value === "admin" || value === "manager" ? value : null;
}

/** Where someone may go. An Engineering manager never sees Reference data. */
export function accessFor(role: Role | null, pathname: string): { allowed: true } | { allowed: false; goTo: string } {
  if (pathname === "/") return { allowed: true };
  if (!role) return { allowed: false, goTo: "/" };
  if (role === "manager" && (pathname === "/reference" || pathname.startsWith("/reference/"))) return { allowed: false, goTo: "/projects" };
  return { allowed: true };
}
