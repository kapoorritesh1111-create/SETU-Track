import { countOvertimeDays, getWeekBounds, hoursByDay, totalHours } from "../time/weekly";
import { isProfileComplete } from "../../profileCompletion";

export type QueueEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  project_id: string;
  notes: string | null;
  status: string;
  hours_worked: number | null;
  full_name?: string | null;
  project_name?: string | null;
  time_in?: string | null;
  time_out?: string | null;
  hourly_rate_snapshot?: number | null;
};

export type QueueProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  hourly_rate?: number | null;
  is_active?: boolean | null;
  onboarding_completed_at?: string | null;
};

export type QueueGroup = {
  key: string;
  user_id: string;
  contractor_name: string;
  week_start: string;
  week_end: string;
  entries: QueueEntry[];
  project_count: number;
  day_count: number;
  total_hours: number;
  anomalies: string[];
  notes_history: Array<{ at: string; actor_name: string | null; note: string | null; action: string }>;
};

export function buildApprovalQueue(params: {
  entries: QueueEntry[];
  profilesById: Record<string, QueueProfile>;
  projectNamesById: Record<string, string>;
  notesHistoryByUserWeek?: Record<string, Array<{ at: string; actor_name: string | null; note: string | null; action: string }>>;
}) {
  const { entries, profilesById, projectNamesById, notesHistoryByUserWeek = {} } = params;
  const map = new Map<string, QueueGroup>();

  for (const entry of entries) {
    const { week_start, week_end } = getWeekBounds(entry.entry_date);
    const key = `${entry.user_id}|${week_start}`;
    const contractorName = entry.full_name || profilesById[entry.user_id]?.full_name || "Unknown user";
    if (!map.has(key)) {
      map.set(key, {
        key,
        user_id: entry.user_id,
        contractor_name: contractorName,
        week_start,
        week_end,
        entries: [],
        project_count: 0,
        day_count: 0,
        total_hours: 0,
        anomalies: [],
        notes_history: notesHistoryByUserWeek[key] || [],
      });
    }
    const group = map.get(key)!;
    group.entries.push({
      ...entry,
      project_name: entry.project_name || projectNamesById[entry.project_id] || "Untitled project",
    });
  }

  return Array.from(map.values())
    .map((group) => {
      group.entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      group.total_hours = totalHours(group.entries);
      group.project_count = new Set(group.entries.map((entry) => entry.project_id)).size;
      group.day_count = Object.keys(hoursByDay(group.entries)).length;

      const anomalies = new Set<string>();
      const profile = profilesById[group.user_id] || null;
      if (!isProfileComplete(profile as any)) anomalies.add("incomplete_profile");
      if (Number(profile?.hourly_rate ?? 0) <= 0) anomalies.add("missing_rate");
      if (group.entries.some((entry) => !entry.time_in || !entry.time_out)) anomalies.add("missing_time");
      if (countOvertimeDays(group.entries, 8) > 0) anomalies.add("overtime");
      if (group.entries.some((entry) => {
        const liveRate = Number(profile?.hourly_rate ?? 0);
        const snapshot = Number(entry.hourly_rate_snapshot ?? 0);
        return snapshot > 0 && liveRate > 0 && Math.abs(snapshot - liveRate) > 0.009;
      })) anomalies.add("rate_mismatch");
      group.anomalies = Array.from(anomalies);
      return group;
    })
    .sort((a, b) => (a.week_start === b.week_start ? a.contractor_name.localeCompare(b.contractor_name) : b.week_start.localeCompare(a.week_start)));
}
