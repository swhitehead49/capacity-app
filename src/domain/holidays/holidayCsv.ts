import type { PublicHoliday } from "../capacity/holidays";

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
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((line, i) => ({ number: i + 1, cells: splitCsvLine(line) }));
  const rows = lines.filter((l) => l.cells.some((c) => c !== ""));
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

/** "2027-01-26" or "26/01/2027" → "2027-01-26"; anything else (or 31 Feb) → null. */
function toIsoDate(raw: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
  if (!y || !m || !d) return null;
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const check = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(check.getTime()) && check.toISOString().startsWith(date) ? date : null;
}

/** Split one CSV line on commas, allowing "quoted, values" and "" for a quote. Cells are trimmed. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(cell.trim()); cell = ""; }
    else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}
