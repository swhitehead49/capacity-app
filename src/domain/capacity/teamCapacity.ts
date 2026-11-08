import { splitCapacity, type ResolvedAllocation } from "./allocation";
import { availableDays, countAbsenceDays, type Absence, type AvailabilityMode } from "./availability";
import { allocatedFte } from "./fte";
import { countHolidayWeekdays, type Location, type PublicHoliday } from "./holidays";
import { countWeekdays, eachDay, effectiveWindow, type DateRange, type Employment } from "./workingWindow";

/** One person on the team, as entered. Missing values are null (FR-03). */
export interface Member {
  id: string;
  active: boolean;
  location: Location | null;
  contractedHours: number | null;
  standardHours: number | null;
  teamAllocation: number | null;
  employment: Employment;
  absences: Absence[];
}

/** Monthly availability forecast for one region, e.g. 0.9 in "2026-11". */
export interface Forecast {
  region: string;
  month: string; // "YYYY-MM"
  availability: number;
}

export interface TeamCapacityInput {
  period: DateRange;
  mode: AvailabilityMode;
  members: Member[];
  holidays: PublicHoliday[];
  holidayCalendarsLoaded: string[]; // "DE:2026" = German holidays for 2026 are loaded
  forecasts: Forecast[];
  allocation: ResolvedAllocation;
}

export type InputStatus =
  | "Complete"
  | "Inactive"
  | "Missing location"
  | "Missing contracted hours"
  | "Missing standard hours"
  | "Missing team allocation";

export type CapacityStatus = "Ready" | "Calendar capacity only" | "Provisional" | "Excluded";

export interface MemberCapacity {
  id: string;
  inputStatus: InputStatus;
  status: CapacityStatus;
  allocatedFte: number;
  scheduledDays: number;
  holidayDeduction: number;
  calendarAvailableDays: number;
}

export interface TeamCapacity {
  headcount: number;
  capacityReadyPeople: number;
  allocatedFte: number;
  scheduledDays: number;
  holidayDeduction: number;
  calendarAvailableDays: number;
  engineeringDays: number | null;
  run: number | null;
  fix: number | null;
  sustain: number | null;
  change: number | null;
  members: MemberCapacity[];
}

/** FR-13 / FR-14: capacity for each member and the team total, following requirements §3. */
export function teamCapacity(input: TeamCapacityInput): TeamCapacity {
  const forecastMonth = midpointMonth(input.period); // BR-12
  const members = input.members.map((member) => memberCapacity(member, input, forecastMonth));
  const total = (pick: (m: MemberCapacity) => number) => members.reduce((sum, m) => sum + pick(m), 0);
  const calendarAvailableDays = total((m) => m.calendarAvailableDays);

  return {
    headcount: members.length,
    capacityReadyPeople: members.filter((m) => m.inputStatus === "Complete").length,
    allocatedFte: total((m) => m.allocatedFte),
    scheduledDays: total((m) => m.scheduledDays),
    holidayDeduction: total((m) => m.holidayDeduction),
    calendarAvailableDays,
    ...splitCapacity(calendarAvailableDays, input.allocation),
    members,
  };
}

function memberCapacity(member: Member, input: TeamCapacityInput, forecastMonth: string): MemberCapacity {
  const inputStatus = checkInputs(member);
  if (inputStatus !== "Complete" || !member.location) {
    return { id: member.id, inputStatus, status: "Excluded", allocatedFte: 0, scheduledDays: 0, holidayDeduction: 0, calendarAvailableDays: 0 };
  }

  const fte = allocatedFte({
    contractedHours: member.contractedHours!,
    standardHours: member.standardHours!,
    teamAllocation: member.teamAllocation!,
  });
  const window = effectiveWindow(input.period, member.employment);
  const weekdays = countWeekdays(window);
  const holidayDays = countHolidayWeekdays(window, member.location, input.holidays);
  const absenceDays = countAbsenceDays(window, member.location, member.absences, input.holidays);
  const forecast =
    input.forecasts.find((f) => f.region === member.location!.region && f.month === forecastMonth)?.availability ?? null;
  const available = availableDays({ workingDays: weekdays - holidayDays, absenceDays, forecast, mode: input.mode });

  return {
    id: member.id,
    inputStatus,
    status: capacityStatus(member.location, input),
    allocatedFte: fte,
    scheduledDays: fte * weekdays,
    holidayDeduction: fte * holidayDays,
    calendarAvailableDays: fte * available,
  };
}

/** FR-04: the first missing input, in the order the workbook checks them. */
export function checkInputs(member: Pick<Member, "active" | "location" | "contractedHours" | "standardHours" | "teamAllocation">): InputStatus {
  if (!member.active) return "Inactive";
  if (!member.location) return "Missing location";
  if (member.contractedHours === null) return "Missing contracted hours";
  if (member.standardHours === null) return "Missing standard hours";
  if (member.teamAllocation === null) return "Missing team allocation";
  return "Complete";
}

/** FR-14 / BR-10: flag missing holiday data before checking the allocation. */
function capacityStatus(location: Location, input: TeamCapacityInput): CapacityStatus {
  const years = new Set([input.period.start.slice(0, 4), input.period.end.slice(0, 4)]);
  const holidaysLoaded = [...years].every((year) => input.holidayCalendarsLoaded.includes(`${location.country}:${year}`));
  if (!holidaysLoaded) return "Provisional";
  if (input.allocation.split === null) return "Calendar capacity only";
  return "Ready";
}

/** BR-12: the month containing the middle day of the period, as "YYYY-MM". */
function midpointMonth(period: DateRange): string {
  const days = eachDay(period);
  return (days[Math.floor((days.length - 1) / 2)] ?? period.start).slice(0, 7);
}
