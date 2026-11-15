"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseRole } from "@/src/domain/access/roles";
import { ROLE_COOKIE } from "@/app/lib/rememberedProject";

/** The home screen's answer (sean, 15 Nov 2026): an Admin goes to Reference data, an Engineering manager chooses a project. */
export async function chooseRoleAction(form: FormData) {
  const role = parseRole(String(form.get("role")));
  if (!role) redirect("/");
  (await cookies()).set(ROLE_COOKIE, role, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  redirect(role === "admin" ? "/reference" : "/projects");
}
