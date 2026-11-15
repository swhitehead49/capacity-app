// Reading CSV files saved from Excel. Pure helpers shared by every upload.

/** The non-blank lines of a CSV file, each split into trimmed cells, with its line number in the file. */
export function csvRows(text: string): { number: number; cells: string[] }[] {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/)
    .map((line, i) => ({ number: i + 1, cells: splitCsvLine(line) }))
    .filter((l) => l.cells.some((c) => c !== ""));
}

/** "2027-01-26" or "26/01/2027" → "2027-01-26"; anything else (or 31 Feb) → null. */
export function toIsoDate(raw: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
  if (!y || !m || !d) return null;
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const check = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(check.getTime()) && check.toISOString().startsWith(date) ? date : null;
}

/** Split one CSV line on commas, allowing "quoted, values" and "" for a quote. Cells are trimmed. */
export function splitCsvLine(line: string): string[] {
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
