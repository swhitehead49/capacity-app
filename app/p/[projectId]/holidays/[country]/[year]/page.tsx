import { redirect } from "next/navigation";

/** Public holidays moved into Reference data (sean, 15 Nov 2026). Old links still work. */
export default async function OldHolidayCalendar({ params }: { params: Promise<{ country: string; year: string }> }) {
  const { country, year } = await params;
  redirect(`/reference/public-holidays/${country}/${year}`);
}
