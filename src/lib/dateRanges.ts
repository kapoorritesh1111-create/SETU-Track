export type WeekStart = "sunday" | "monday";
export type DatePreset = "current_week" | "last_week" | "current_month" | "last_month" | "custom";

export function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeek(d: Date, weekStart: WeekStart) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = weekStart === "sunday" ? day : (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(d: Date, weekStart: WeekStart) {
  const s = startOfWeek(d, weekStart);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(0, 0, 0, 0);
  return e;
}

function firstDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function presetToRange(preset: Exclude<DatePreset, "custom">, weekStart: WeekStart = "sunday") {
  const now = new Date();

  if (preset === "current_week") {
    const s = startOfWeek(now, weekStart);
    const e = endOfWeek(now, weekStart);
    return { start: toISODate(s), end: toISODate(e) };
  }

  if (preset === "last_week") {
    const ref = new Date(now);
    ref.setDate(now.getDate() - 7);
    const s = startOfWeek(ref, weekStart);
    const e = endOfWeek(ref, weekStart);
    return { start: toISODate(s), end: toISODate(e) };
  }

  if (preset === "current_month") {
    return { start: toISODate(firstDayOfMonth(now)), end: toISODate(lastDayOfMonth(now)) };
  }

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start: toISODate(firstDayOfMonth(lastMonth)), end: toISODate(lastDayOfMonth(lastMonth)) };
}

export function previousRangeFor(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
  const prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return { start: toISODate(prevStart), end: toISODate(prevEnd) };
}

export function presetLabel(preset: DatePreset, start?: string, end?: string) {
  switch (preset) {
    case "current_week":
      return "Current week";
    case "last_week":
      return "Last week";
    case "current_month":
      return "Current month";
    case "last_month":
      return "Last month";
    case "custom":
      return start && end ? `${start} → ${end}` : "Custom range";
    default:
      return "Period";
  }
}
