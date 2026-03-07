import { addDays, parseISODate, startOfWeekSunday, toISODate } from "../../date";

export type DailyHoursMap = Record<string, number>;

export function getWeekBounds(entryDate: string) {
  const start = startOfWeekSunday(parseISODate(entryDate));
  return {
    week_start: toISODate(start),
    week_end: toISODate(addDays(start, 6)),
  };
}

export function totalHours(rows: Array<{ hours_worked?: number | null }>) {
  return rows.reduce((sum, row) => sum + Number(row.hours_worked ?? 0), 0);
}

export function hoursByDay(rows: Array<{ entry_date: string; hours_worked?: number | null }>): DailyHoursMap {
  return rows.reduce<DailyHoursMap>((acc, row) => {
    const key = row.entry_date;
    acc[key] = (acc[key] ?? 0) + Number(row.hours_worked ?? 0);
    return acc;
  }, {});
}

export function countOvertimeDays(rows: Array<{ entry_date: string; hours_worked?: number | null }>, threshold = 8) {
  return Object.values(hoursByDay(rows)).filter((hours) => hours > threshold).length;
}
