const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-11-30" → "30 Nov 2026"; blank stays blank. */
export function formatDate(date: string | null): string {
  return date ? day.format(new Date(`${date}T00:00:00Z`)) : "";
}

/** 0.9 → "90"; blank stays blank. */
export function percent(fraction: number | null): string {
  return fraction === null ? "" : String(Math.round(fraction * 10000) / 100);
}
