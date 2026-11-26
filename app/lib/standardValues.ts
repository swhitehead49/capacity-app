import type { StandardAllocation, StandardRequest } from "@/src/application/standardAllocation";
import { percent } from "@/app/lib/format";

/** A standard allocation as the form shows it (percentages 0–100). */
export function standardFormValues(standard: StandardAllocation | null): Record<string, string> {
  if (!standard) return {};
  return {
    overhead: percent(standard.overhead), contingency: percent(standard.contingency),
    run: percent(standard.split.run), fix: percent(standard.split.fix), sustain: percent(standard.split.sustain),
    change: percent(standard.split.change), enabling: percent(standard.split.enabling),
  };
}

/** A one-line summary, e.g. "Organisational 10% · Unplanned 0% · Maintenance 30% …". */
export function describeStandard(standard: StandardAllocation): string {
  const s = standard.split;
  return [
    ["Organisational", standard.overhead], ["Unplanned", standard.contingency], ["Maintenance", s.run + s.fix],
    ["Technical improvements", s.sustain], ["Change", s.change], ["Enabling/Training", s.enabling],
  ].map(([label, value]) => `${label} ${percent(value as number)}%`).join(" · ");
}

/** Read the seven percentages typed into a standard allocation form. */
export function readStandardForm(form: FormData): StandardRequest {
  const read = (name: string) => String(form.get(name) ?? "").trim();
  const fraction = (name: string) => (read(name) === "" ? null : Number(read(name)) / 100);
  return {
    overhead: fraction("overhead"),
    contingency: fraction("contingency"),
    split: {
      run: fraction("run") ?? 0, fix: fraction("fix") ?? 0, sustain: fraction("sustain") ?? 0,
      change: fraction("change") ?? 0, enabling: fraction("enabling") ?? 0,
    },
  };
}
