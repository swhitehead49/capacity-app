import type { PublicHoliday } from "../capacity/holidays";
import { csvRows, toIsoDate } from "../shared/csv";

export interface CsvResult {
  holidays: PublicHoliday[];
  errors: string[];
}

const DATE_HINT = "(use YYYY-MM-DD or DD/MM/YYYY)";

/**
 * Decision Q4: read a company holiday list. Pure: takes the file's text, returns
 * the holidays plus one plain-English error per bad line. Any error = load nothing.
 */
export function parseHolidayCsv(text: string, target: { country: string; year: number }): CsvResult {
  const rows = csvRows(text);
  const header = rows.shift()?.cells.map((c) => c.toLowerCase()) ?? [];
  const col = { date: header.indexOf("date"), name: header.indexOf("name"), regions: header.indexOf("regions") };
  if (col.date < 0 || col.name < 0) {
    return { holidays: [], errors: ['The first line must be the headings "date,name" (and optionally ",regions")'] };
  }

  const holidays: PublicHoliday[] = [];
  const errors: string[] = [];
  for (const { number, cells } of rows) {
    const raw = cells[col.date] ?? "";
    const name = cells[col.name] ?? "";
    const date = toIsoDate(raw);
    if (!date) errors.push(`Line ${number}: "${raw}" is not a real date ${DATE_HINT}`);
    else if (!date.startsWith(`${target.year}-`)) errors.push(`Line ${number}: ${date} is not in ${target.year}`);
    else if (!name) errors.push(`Line ${number}: the holiday needs a name`);
    else {
      const regions = col.regions < 0 ? [] : (cells[col.regions] ?? "").split(";").map((r) => r.trim()).filter(Boolean);
      holidays.push({ date, country: target.country, regions, name });
    }
  }
  if (holidays.length === 0 && errors.length === 0) errors.push("The file has no holidays in it");
  return { holidays: errors.length ? [] : holidays, errors };
}
