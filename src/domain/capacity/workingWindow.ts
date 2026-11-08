/** A date written as "YYYY-MM-DD". Text dates compare correctly and never shift with time zones. */
export type IsoDate = string;

/** A range of days, first and last day both included. */
export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

/** Employment dates. A missing date means "no limit" (BR-08). */
export interface Employment {
  start?: IsoDate | null;
  end?: IsoDate | null;
}

/**
 * Step 3 (requirements §3): the part of the period the person is employed.
 * Returns null when they are not employed at any point in the period.
 */
export function effectiveWindow(period: DateRange, employment: Employment): DateRange | null {
  const start = later(period.start, employment.start);
  const end = earlier(period.end, employment.end);
  return start <= end ? { start, end } : null;
}

/** Step 4 (requirements §3): Monday–Friday days in the range, both ends included. */
export function countWeekdays(range: DateRange | null): number {
  return eachDay(range).filter(isWeekday).length;
}

/** Every date in the range, both ends included. */
export function eachDay(range: DateRange | null): IsoDate[] {
  if (!range) return [];
  const days: IsoDate[] = [];
  for (let day = toUtc(range.start); day <= toUtc(range.end); day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

/** True for Monday to Friday. */
export function isWeekday(date: IsoDate): boolean {
  const weekday = toUtc(date).getUTCDay(); // 0 = Sunday, 6 = Saturday
  return weekday !== 0 && weekday !== 6;
}

function later(date: IsoDate, limit?: IsoDate | null): IsoDate {
  return limit && limit > date ? limit : date;
}

function earlier(date: IsoDate, limit?: IsoDate | null): IsoDate {
  return limit && limit < date ? limit : date;
}

function toUtc(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}
