import { redirect } from "next/navigation";

/** Public holidays moved into Reference data (sean, 15 Nov 2026). Old links still work. */
export default function OldHolidays() {
  redirect("/reference/public-holidays");
}
