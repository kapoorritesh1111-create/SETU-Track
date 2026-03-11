// src/app/timesheet/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import RequireOnboarding from "../../components/auth/RequireOnboarding";
import AppShell from "../../components/layout/AppShell";
import { supabase } from "../../lib/supabaseBrowser";
import { useProfile } from "../../lib/useProfile";
import { addDays, formatShort, parseISODate, startOfWeekSunday, toISODate, weekRangeLabel } from "../../lib/date";
import { StatusChip } from "../../components/ui/StatusChip";
import Button from "../../components/ui/Button";

type Project = {
  id: string;
  name: string;
  parent_id?: string | null;
  is_active?: boolean | null;
};

type EntryStatus = "draft" | "submitted" | "approved" | "rejected";

type TimeEntryRow = {
  id: string;
  entry_date: string; // YYYY-MM-DD
  project_id: string;
  time_in: string | null; // "HH:MM:SS"
  time_out: string | null;
  lunch_hours: number | null;
  mileage: number | null;
  notes: string | null;
  status: EntryStatus;
  rejection_reason?: string | null;
  hours_worked?: number | null; // exists in v_time_entries after DB fix
};



type WeekTemplate = {
  name: string;
  isDefault?: boolean;
  rows: Array<{
    dayOffset: number;
    project_id: string;
    time_in: string;
    time_out: string;
    lunch_hours: number;
    mileage: number;
    notes: string;
  }>;
};
type DraftRow = {
  id?: string;
  tempId: string;
  entry_date: string;
  project_id: string;
  time_in: string; // "HH:MM"
  time_out: string; // "HH:MM"
  lunch_hours: number;
  mileage: number;
  notes: string;
  status?: EntryStatus;
  rejection_reason?: string | null;
};

function timeToHHMM(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function normalizeHHMM(s: string): string {
  if (!s) return "";
  const [hRaw, mRaw] = s.split(":");
  const h = String(Number(hRaw ?? 0)).padStart(2, "0");
  const m = String(Number(mRaw ?? 0)).padStart(2, "0");
  return `${h}:${m}`;
}

function getRowHours(row: Pick<DraftRow, "time_in" | "time_out" | "lunch_hours">): number {
  const tin = row.time_in ? normalizeHHMM(row.time_in) : "";
  const tout = row.time_out ? normalizeHHMM(row.time_out) : "";
  if (!tin || !tout) return 0;

  const [h1, m1] = tin.split(":").map(Number);
  const [h2, m2] = tout.split(":").map(Number);
  if ([h1, m1, h2, m2].some((x) => Number.isNaN(x))) return 0;

  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;
  const minutes = Math.max(end - start, 0);
  return Math.max(minutes / 60 - (row.lunch_hours ?? 0), 0);
}

function StatusPill({ status }: { status: EntryStatus | undefined }) {
  const s = (status ?? "draft") as EntryStatus;
  return <StatusChip status={s} />;
}

function cloneDraftRow(source: DraftRow, entryDate: string): DraftRow {
  return {
    tempId: `tmp_${crypto.randomUUID()}` ,
    entry_date: entryDate,
    project_id: source.project_id,
    time_in: source.time_in,
    time_out: source.time_out,
    lunch_hours: Number(source.lunch_hours ?? 0),
    mileage: Number(source.mileage ?? 0),
    notes: source.notes ?? "",
    status: "draft",
    rejection_reason: null,
  };
}

function mergeUnlockedDayRows(currentRows: DraftRow[], dayISO: string, replacementRows: DraftRow[]) {
  const locked = currentRows.filter((r) => r.entry_date === dayISO && (r.status === "submitted" || r.status === "approved"));
  const otherDays = currentRows.filter((r) => r.entry_date !== dayISO);
  return [...otherDays, ...locked, ...replacementRows];
}

function defaultTemplateName(list: WeekTemplate[]) {
  return list.find((template) => template.isDefault)?.name || "";
}

function SetuTrackInner() {
  const { loading: profLoading, profile, userId } = useProfile();

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekSunday(new Date()));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart]);
  const weekEndISO = useMemo(() => toISODate(addDays(weekStart, 6)), [weekStart]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [templates, setTemplates] = useState<WeekTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<string[]>([]);

  const canView = !!userId && !!profile;
  const isManagerOrAdmin = profile?.role === "admin" || profile?.role === "manager";
  const isContractor = profile?.role === "contractor";

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = window.localStorage.getItem(`setu-track-week-templates:${userId}`);
      setTemplates(raw ? JSON.parse(raw) : []);
    } catch {
      setTemplates([]);
    }
    try {
      const rawFavs = window.localStorage.getItem(`setu-track-favorite-projects:${userId}`);
      setFavoriteProjectIds(rawFavs ? JSON.parse(rawFavs) : []);
    } catch {
      setFavoriteProjectIds([]);
    }
  }, [userId]);

  function persistFavoriteProjects(next: string[]) {
    setFavoriteProjectIds(next);
    if (!userId) return;
    try {
      window.localStorage.setItem(`setu-track-favorite-projects:${userId}`, JSON.stringify(next));
    } catch {}
  }

  function persistTemplates(next: WeekTemplate[]) {
    setTemplates(next);
    if (!userId) return;
    try {
      window.localStorage.setItem(`setu-track-week-templates:${userId}`, JSON.stringify(next));
    } catch {}
  }

  useEffect(() => {
    if (!canView) return;

    let cancelled = false;

    (async () => {
      setLoadingWeek(true);
      setMsg("");

      // PROJECTS (STRICT)
      // - Admin/Manager: org active projects
      // - Contractor: ONLY membership-based projects
      try {
        if (isManagerOrAdmin) {
          const { data: projRows, error: projErr } = await supabase
            .from("projects")
            .select("id, name, parent_id, is_active")
            .eq("org_id", profile!.org_id)
            .eq("is_active", true)
            .order("name", { ascending: true });

          if (!cancelled) {
            if (projErr) setMsg(projErr.message);
            setProjects((((projRows as any) ?? []) as Project[]) || []);
          }
        } else {
          const { data: pm, error: pmErr } = await supabase
            .from("project_members")
            .select("project_id, projects:project_id (id, name, parent_id, is_active)")
            .eq("profile_id", userId!)
            .eq("is_active", true);

          if (!cancelled) {
            if (pmErr) {
              setMsg(pmErr.message);
              setProjects([]);
            } else {
              const list = (((pm as any) ?? []) as any[]).map((x) => x.projects).filter(Boolean) as Project[];
              const uniq = Array.from(new Map(list.map((p) => [p.id, p])).values())
                .filter((p) => p.is_active !== false)
                .sort((a, b) => a.name.localeCompare(b.name));
              setProjects(uniq);
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setMsg(e?.message || "Failed to load projects");
          setProjects([]);
        }
      }

      // ENTRIES
      // NOTE: We read from time_entries so we can show rejection_reason.
      const { data: entryRows, error: entryErr } = await supabase
        .from("time_entries")
        .select("id, entry_date, project_id, time_in, time_out, lunch_hours, mileage, notes, status, rejection_reason")
        .eq("user_id", userId!)
        .gte("entry_date", weekStartISO)
        .lte("entry_date", weekEndISO)
        .order("entry_date", { ascending: true });

      if (!cancelled) {
        if (entryErr) {
          setMsg((m) => (m ? `${m}\n${entryErr.message}` : entryErr.message));
          setRows([]);
          setLoadingWeek(false);
          return;
        }

        const mapped: DraftRow[] = (((entryRows as any) ?? []) as TimeEntryRow[]).map((r) => ({
          id: r.id,
          tempId: r.id,
          entry_date: r.entry_date,
          project_id: r.project_id,
          time_in: timeToHHMM(r.time_in),
          time_out: timeToHHMM(r.time_out),
          lunch_hours: Number(r.lunch_hours ?? 0),
          mileage: Number(r.mileage ?? 0),
          notes: r.notes ?? "",
          status: r.status,
          rejection_reason: (r as any).rejection_reason ?? null,
        }));

        setRows(mapped);
        setLoadingWeek(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canView, userId, profile, isManagerOrAdmin, weekStartISO, weekEndISO]);

  const hoursByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of weekDays) map[toISODate(d)] = 0;

    for (const r of rows) {
      const dayKey = r.entry_date;
      map[dayKey] = (map[dayKey] ?? 0) + getRowHours(r);
    }
    return map;
  }, [rows, weekDays]);

  const weekTotal = useMemo(() => Object.values(hoursByDay).reduce((a, b) => a + b, 0), [hoursByDay]);
  const weekStats = useMemo(() => {
    const statuses = rows.reduce(
      (acc, row) => {
        const status = row.status ?? "draft";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      { draft: 0, submitted: 0, approved: 0, rejected: 0 } as Record<EntryStatus, number>
    );

    const daysWithEntries = weekDays.filter((day) => rows.some((row) => row.entry_date === toISODate(day))).length;
    const missingDays = weekDays.length - daysWithEntries;
    const avgDay = daysWithEntries > 0 ? weekTotal / daysWithEntries : 0;

    return {
      daysWithEntries,
      missingDays,
      avgDay,
      submitted: statuses.submitted,
      approved: statuses.approved,
      draft: statuses.draft,
      rejected: statuses.rejected,
    };
  }, [rows, weekDays, weekTotal]);

  function addLine(entryDateISO: string) {
    const tempId = `tmp_${crypto.randomUUID()}`;
    const firstProject = projects[0]?.id ?? "";
    setRows((prev) => [
      ...prev,
      {
        tempId,
        entry_date: entryDateISO,
        project_id: firstProject,
        time_in: "",
        time_out: "",
        lunch_hours: 0,
        mileage: 0,
        notes: "",
        status: "draft",
      },
    ]);
  }

  function removeLine(tempId: string) {
    setRows((prev) => prev.filter((r) => r.tempId !== tempId));
  }

  function updateRow(tempId: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  async function saveDraft() {
    if (!userId || !profile) return;

    if (isContractor && projects.length === 0) {
      setMsg("No projects assigned. Ask your admin to assign projects (Profiles → Project access).");
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const weekRows = rows.filter((r) => r.entry_date >= weekStartISO && r.entry_date <= weekEndISO);

      const results = await Promise.all(
        weekRows.map(async (r) => {
          const hasAnyInput =
            !!r.project_id ||
            !!r.time_in ||
            !!r.time_out ||
            (r.lunch_hours ?? 0) > 0 ||
            (r.mileage ?? 0) > 0 ||
            !!r.notes;

          if (!hasAnyInput) return { ok: true, skipped: true };
          if (!r.project_id) return { ok: false, error: `Project required for ${r.entry_date}` };
          if (r.status === "submitted" || r.status === "approved") return { ok: true, skipped: true };

          const payload = {
            org_id: profile.org_id,
            user_id: userId,
            entry_date: r.entry_date,
            project_id: r.project_id,
            time_in: r.time_in ? normalizeHHMM(r.time_in) + ":00" : null,
            time_out: r.time_out ? normalizeHHMM(r.time_out) + ":00" : null,
            lunch_hours: r.lunch_hours ?? 0,
            mileage: r.mileage ?? 0,
            notes: r.notes ?? null,
            status: (r.status === "rejected" ? "draft" : (r.status ?? "draft")) as EntryStatus,
          };

          if (r.id) {
            const { error } = await supabase.from("time_entries").update(payload).eq("id", r.id);
            if (error) return { ok: false, error: error.message };
            return { ok: true };
          } else {
            const { data, error } = await supabase.from("time_entries").insert(payload).select("id").single();
            if (error) return { ok: false, error: error.message };
            updateRow(r.tempId, { id: data.id, tempId: data.id });
            return { ok: true };
          }
        })
      );

      const errors = results.filter((x: any) => !x.ok).map((x: any) => x.error);
      setMsg(errors.length ? errors.join("\n") : "Saved ✅");
    } finally {
      setBusy(false);
    }
  }

  async function submitWeek() {
    if (!userId) return;

    if (isContractor && projects.length === 0) {
      setMsg("No projects assigned. Ask your admin to assign projects (Profiles → Project access).");
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ status: "submitted" })
        .eq("user_id", userId)
        .gte("entry_date", weekStartISO)
        .lte("entry_date", weekEndISO)
        .in("status", ["draft", "rejected"]);

      if (error) {
        setMsg(error.message);
        return;
      }

      const { data: entryRows, error: entryErr } = await supabase
        .from("time_entries")
        .select("id, entry_date, project_id, time_in, time_out, lunch_hours, mileage, notes, status, rejection_reason")
        .eq("user_id", userId)
        .gte("entry_date", weekStartISO)
        .lte("entry_date", weekEndISO)
        .order("entry_date", { ascending: true });

      if (entryErr) {
        setMsg(`Submitted, but reload failed: ${entryErr.message}`);
        return;
      }

      const mapped: DraftRow[] = (((entryRows as any) ?? []) as TimeEntryRow[]).map((r) => ({
        id: r.id,
        tempId: r.id,
        entry_date: r.entry_date,
        project_id: r.project_id,
        time_in: timeToHHMM(r.time_in),
        time_out: timeToHHMM(r.time_out),
        lunch_hours: Number(r.lunch_hours ?? 0),
        mileage: Number(r.mileage ?? 0),
        notes: r.notes ?? "",
        status: r.status,
        rejection_reason: (r as any).rejection_reason ?? null,
      }));

      setRows(mapped);
      setMsg("Week submitted ✅");
    } finally {
      setBusy(false);
    }
  }


  function copyPreviousDayInto(dayISO: string) {
    const previousISO = toISODate(addDays(parseISODate(dayISO), -1));
    const sourceRows = rows.filter((r) => r.entry_date === previousISO);
    if (!sourceRows.length) {
      setMsg("No previous-day lines found to copy.");
      return;
    }
    setRows((prev) => mergeUnlockedDayRows(prev, dayISO, sourceRows.map((row) => cloneDraftRow(row, dayISO))));
    setMsg(`Copied ${sourceRows.length} line${sourceRows.length === 1 ? "" : "s"} from ${previousISO} to ${dayISO}.`);
  }

  async function copyLastWeekIntoCurrentWeek() {
    if (!userId) return;
    setBusy(true);
    setMsg("");
    try {
      const sourceStart = toISODate(addDays(weekStart, -7));
      const sourceEnd = toISODate(addDays(weekStart, -1));
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, entry_date, project_id, time_in, time_out, lunch_hours, mileage, notes, status, rejection_reason")
        .eq("user_id", userId)
        .gte("entry_date", sourceStart)
        .lte("entry_date", sourceEnd)
        .neq("status", "rejected")
        .order("entry_date", { ascending: true });

      if (error) {
        setMsg(error.message);
        return;
      }
      const sourceRows = (((data as any) ?? []) as TimeEntryRow[]).map((r) => ({
        tempId: `src_${r.id}`,
        entry_date: r.entry_date,
        project_id: r.project_id,
        time_in: timeToHHMM(r.time_in),
        time_out: timeToHHMM(r.time_out),
        lunch_hours: Number(r.lunch_hours ?? 0),
        mileage: Number(r.mileage ?? 0),
        notes: r.notes ?? "",
        status: "draft" as EntryStatus,
        rejection_reason: null,
      }));

      if (!sourceRows.length) {
        setMsg("No entries found in the prior week to copy.");
        return;
      }

      setRows((prev) => {
        let next = [...prev];
        for (let offset = 0; offset < 7; offset += 1) {
          const sourceDayISO = toISODate(addDays(weekStart, offset - 7));
          const targetDayISO = toISODate(addDays(weekStart, offset));
          const dayRows = sourceRows.filter((row) => row.entry_date === sourceDayISO);
          if (!dayRows.length) continue;
          next = mergeUnlockedDayRows(next, targetDayISO, dayRows.map((row) => cloneDraftRow(row, targetDayISO)));
        }
        return next;
      });
      setMsg(`Copied last week into ${weekRangeLabel(weekStart)}. Review and edit before submitting.`);
    } finally {
      setBusy(false);
    }
  }

  function setDefaultTemplate() {
    if (!selectedTemplate) {
      setMsg("Select a template first.");
      return;
    }
    const next = templates.map((template) => ({ ...template, isDefault: template.name === selectedTemplate }));
    persistTemplates(next);
    setMsg(`Set “${selectedTemplate}” as the default weekly template.`);
  }

  function applyDefaultTemplate() {
    const defaultName = defaultTemplateName(templates);
    if (!defaultName) {
      setMsg("No default template is set yet.");
      return;
    }
    setSelectedTemplate(defaultName);
    const template = templates.find((item) => item.name === defaultName);
    if (!template) {
      setMsg("Default template could not be found.");
      return;
    }
    setRows((prev) => {
      let next = [...prev];
      for (let offset = 0; offset < 7; offset += 1) {
        const targetDayISO = toISODate(addDays(weekStart, offset));
        const dayRows = template.rows.filter((row) => row.dayOffset === offset).map((row) => ({
          tempId: `tmp_${crypto.randomUUID()}`,
          entry_date: targetDayISO,
          project_id: row.project_id,
          time_in: row.time_in,
          time_out: row.time_out,
          lunch_hours: row.lunch_hours,
          mileage: row.mileage,
          notes: row.notes,
          status: "draft" as EntryStatus,
          rejection_reason: null,
        }));
        if (!dayRows.length) continue;
        next = mergeUnlockedDayRows(next, targetDayISO, dayRows);
      }
      return next;
    });
    setMsg(`Applied default template “${defaultName}”. Review and edit before saving.`);
  }

  function copyMondayAcrossWeek() {
    const mondayRows = rows.filter((row) => row.entry_date === weekStartISO && row.status !== "submitted" && row.status !== "approved");
    if (!mondayRows.length) {
      setMsg("Add editable lines to the first day of the week before copying across the week.");
      return;
    }
    setRows((prev) => {
      let next = [...prev];
      for (let offset = 1; offset < 7; offset += 1) {
        const targetDayISO = toISODate(addDays(weekStart, offset));
        next = mergeUnlockedDayRows(next, targetDayISO, mondayRows.map((row) => cloneDraftRow(row, targetDayISO)));
      }
      return next;
    });
    setMsg("Copied the first day pattern across the rest of the week. Review and edit before saving.");
  }

  function saveWeekAsTemplate() {
    const baseRows = rows
      .filter((row) => row.entry_date >= weekStartISO && row.entry_date <= weekEndISO)
      .filter((row) => row.project_id || row.time_in || row.time_out || (row.notes ?? "") || Number(row.mileage ?? 0) > 0 || Number(row.lunch_hours ?? 0) > 0)
      .map((row) => ({
        dayOffset: Math.round((parseISODate(row.entry_date).getTime() - weekStart.getTime()) / 86400000),
        project_id: row.project_id,
        time_in: row.time_in,
        time_out: row.time_out,
        lunch_hours: Number(row.lunch_hours ?? 0),
        mileage: Number(row.mileage ?? 0),
        notes: row.notes ?? "",
      }));

    if (!baseRows.length) {
      setMsg("Add at least one line before saving a weekly template.");
      return;
    }

    const name = window.prompt("Template name", `Week template ${templates.length + 1}`)?.trim();
    if (!name) return;

    const existing = templates.find((template) => template.name === name);
    const next = [...templates.filter((template) => template.name !== name), { name, rows: baseRows, isDefault: existing?.isDefault || false }];
    persistTemplates(next);
    setSelectedTemplate(name);
    setMsg(`Saved template “${name}”.`);
  }

  function applyTemplate() {
    const template = templates.find((item) => item.name === selectedTemplate);
    if (!template) {
      setMsg("Select a template first.");
      return;
    }

    setRows((prev) => {
      let next = [...prev];
      for (let offset = 0; offset < 7; offset += 1) {
        const targetDayISO = toISODate(addDays(weekStart, offset));
        const dayRows = template.rows.filter((row) => row.dayOffset === offset).map((row) => ({
          tempId: `tmp_${crypto.randomUUID()}` ,
          entry_date: targetDayISO,
          project_id: row.project_id,
          time_in: row.time_in,
          time_out: row.time_out,
          lunch_hours: row.lunch_hours,
          mileage: row.mileage,
          notes: row.notes,
          status: "draft" as EntryStatus,
          rejection_reason: null,
        }));
        if (!dayRows.length) continue;
        next = mergeUnlockedDayRows(next, targetDayISO, dayRows);
      }
      return next;
    });
    setMsg(`Applied template “${template.name}”. Review and edit before saving.`);
  }

  function deleteSelectedTemplate() {
    if (!selectedTemplate) return;
    const next = templates.filter((template) => template.name !== selectedTemplate);
    persistTemplates(next);
    setSelectedTemplate("");
    setMsg("Template removed.");
  }

  function toggleFavoriteProject(projectId: string) {
    const next = favoriteProjectIds.includes(projectId) ? favoriteProjectIds.filter((id) => id !== projectId) : [...favoriteProjectIds, projectId];
    persistFavoriteProjects(next);
    const projectName = projects.find((item) => item.id === projectId)?.name || "project";
    setMsg(`${next.includes(projectId) ? 'Saved' : 'Removed'} ${projectName} ${next.includes(projectId) ? 'to' : 'from'} favorites.`);
  }

  function addFavoriteProjectLine(projectId: string) {
    const dayISO = weekStartISO;
    const row: DraftRow = {
      tempId: `tmp_${crypto.randomUUID()}`,
      entry_date: dayISO,
      project_id: projectId,
      time_in: "09:00",
      time_out: "17:00",
      lunch_hours: 0.5,
      mileage: 0,
      notes: "",
      status: "draft",
      rejection_reason: null,
    };
    setRows((prev) => {
      const editable = prev.filter((r) => r.entry_date === dayISO && r.status !== "submitted" && r.status !== "approved");
      return mergeUnlockedDayRows(prev, dayISO, [...editable, row]);
    });
    setMsg(`Added favorite project to ${dayISO}. Review the line before saving.`);
  }

  const favoriteProjects = projects.filter((project) => favoriteProjectIds.includes(project.id));

  const actionNeededCount = weekStats.draft + weekStats.rejected;
  const readinessState = weekStats.rejected > 0
    ? "Fix returned entries"
    : actionNeededCount > 0
      ? "Finish this week"
      : weekStats.submitted > 0
        ? "Waiting for approval"
        : "Ready to submit";
  const nextStepLabel = weekStats.rejected > 0
    ? "Edit rejected lines, save, then submit again."
    : weekStats.draft > 0
      ? "Complete remaining draft lines before sending the week for review."
      : weekStats.submitted > 0
        ? "No edit needed unless a manager returns an entry for changes."
        : "Add time as work happens, then submit once the week is complete.";

  const headerSubtitle = profile ? `${weekRangeLabel(weekStart)} • ${readinessState}` : `${weekRangeLabel(weekStart)}`;

  const headerRight = (
    <div className="tsHeaderRight">
      <div className="tsWeekNav">
        <button className="btn btnSecondary btnSm" onClick={() => setWeekStart((d) => addDays(d, -7))} disabled={busy || loadingWeek} title="Previous week" type="button">
          ← Prev
        </button>
        <button
          className="btn btnSecondary btnSm"
          type="button"
          onClick={() => setWeekStart(startOfWeekSunday(new Date()))}
          disabled={busy || loadingWeek}
          title="Jump to current week"
        >
          This week
        </button>
        <button className="btn btnSecondary btnSm" onClick={() => setWeekStart((d) => addDays(d, 7))} disabled={busy || loadingWeek} title="Next week" type="button">
          Next →
        </button>
      </div>

      <div className="tsActions" style={{ flexWrap: "wrap", gap: 8 }}>
        <Button variant="ghost" disabled={busy || loadingWeek} onClick={copyLastWeekIntoCurrentWeek}>
          Copy last week
        </Button>
        <Button variant="ghost" disabled={busy || loadingWeek} onClick={copyMondayAcrossWeek}>
          Copy first day across week
        </Button>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select className="select" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Week template…</option>
            {templates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}{template.isDefault ? " • default" : ""}
              </option>
            ))}
          </select>
          <Button variant="ghost" disabled={!selectedTemplate || busy || loadingWeek} onClick={applyTemplate}>
            Apply template
          </Button>
          <Button variant="ghost" disabled={busy || loadingWeek} onClick={saveWeekAsTemplate}>
            Save as template
          </Button>
          <Button variant="ghost" disabled={!selectedTemplate || busy || loadingWeek} onClick={setDefaultTemplate}>
            Set default
          </Button>
          <Button variant="ghost" disabled={busy || loadingWeek || !defaultTemplateName(templates)} onClick={applyDefaultTemplate}>
            Apply default
          </Button>
          <Button variant="ghost" disabled={!selectedTemplate || busy || loadingWeek} onClick={deleteSelectedTemplate}>
            Delete template
          </Button>
        </div>
        <Button variant="secondary" disabled={busy || loadingWeek} onClick={saveDraft}>
          {busy ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="primary" disabled={busy || loadingWeek} onClick={submitWeek}>
          {busy ? "Working…" : "Submit week"}
        </Button>
      </div>
    </div>
  );

  if (profLoading) {
    return (
      <AppShell title="My work" subtitle="Loading weekly workspace…">
        <div className="card cardPad">
          <div className="muted">Loading…</div>
        </div>
      </AppShell>
    );
  }

  if (!profile || !userId) return null;

  return (
    <AppShell title="My work" subtitle={headerSubtitle} right={headerRight}>
      {msg ? (
        <div className="alert alertInfo">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
      ) : null}

      {isContractor && projects.length === 0 ? (
        <div className="alert alertWarn">
          <div style={{ fontWeight: 950 }}>No projects assigned</div>
          <div className="muted" style={{ marginTop: 6 }}>
            You can’t submit time until an admin assigns at least one project.
          </div>
        </div>
      ) : null}

      <section className="tsCommand">
        <div>
          <div className="tsCommandEyebrow">Connect · Grow · Track</div>
          <h2 className="tsCommandTitle">Weekly time entry workspace</h2>
          <p className="tsCommandText">
            Log time quickly, keep each day clean, and submit only when the full week is ready for review.
          </p>
        </div>
        <div className="tsCommandMeta">
          <div className="tsCommandMetaCard">
            <span>Week range</span>
            <strong>{weekRangeLabel(weekStart)}</strong>
          </div>
          <div className="tsCommandMetaCard">
            <span>Project access</span>
            <strong>{projects.length} active project{projects.length === 1 ? "" : "s"}</strong>
          </div>
        </div>
      </section>

      {favoriteProjects.length ? (
        <section className="card cardPad" style={{ marginBottom: 14 }}>
          <div className="setuCardHeaderRow">
            <div>
              <div className="setuSectionTitle" style={{ fontSize: 18 }}>Favorite projects</div>
              <div className="setuSectionHint">Quick-start repeat work by dropping a saved project onto the first day of the week.</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {favoriteProjects.map((project) => (
              <button key={project.id} type="button" className="pill" onClick={() => addFavoriteProjectLine(project.id)}>
                {project.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="setuSummaryStrip">
        <div className="setuSummaryStripItem">
          <span>What matters now</span>
          <strong>{readinessState}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Next step</span>
          <strong>{weekStats.rejected > 0 ? "Edit and resubmit" : weekStats.draft > 0 ? "Complete draft lines" : weekStats.submitted > 0 ? "Watch approvals" : "Keep logging"}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Action needed</span>
          <strong>{actionNeededCount}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Week total</span>
          <strong>{weekTotal.toFixed(2)} hrs</strong>
        </div>
      </div>

      <div className="card cardPad tsSummary">
        <div className="tsSummaryRow">
          <div>
            <div className="tsSummaryTitle">Work status</div>
            <div className="tsSummaryValue">{readinessState}</div>
            <div className="muted tsSummaryHint">{nextStepLabel}</div>
          </div>
          <div className="tsSummaryAside">
            <div className="tsSummaryAsideItem">
              <span>Approved</span>
              <strong>{weekStats.approved}</strong>
            </div>
            <div className="tsSummaryAsideItem">
              <span>Submitted</span>
              <strong>{weekStats.submitted}</strong>
            </div>
            <div className="tsSummaryAsideItem">
              <span>Rejected</span>
              <strong>{weekStats.rejected}</strong>
            </div>
          </div>
        </div>
      </div>

      <section className="tsMetricsGrid">
        <div className="tsMetricCard">
          <div className="tsMetricLabel">Days logged</div>
          <div className="tsMetricValueSmall">{weekStats.daysWithEntries}/7</div>
          <div className="tsMetricHint">{weekStats.missingDays} day{weekStats.missingDays === 1 ? "" : "s"} still empty this week</div>
        </div>
        <div className="tsMetricCard">
          <div className="tsMetricLabel">Submitted lines</div>
          <div className="tsMetricValueSmall">{weekStats.submitted}</div>
          <div className="tsMetricHint">{weekStats.approved} approved • {weekStats.draft} still in draft</div>
        </div>
        <div className="tsMetricCard">
          <div className="tsMetricLabel">Average logged day</div>
          <div className="tsMetricValueSmall">{weekStats.avgDay.toFixed(2)} hrs</div>
          <div className="tsMetricHint">Average across the {weekStats.daysWithEntries || 0} day(s) with entries</div>
        </div>
        <div className="tsMetricCard">
          <div className="tsMetricLabel">Week total</div>
          <div className="tsMetricValueSmall">{weekTotal.toFixed(2)} hrs</div>
          <div className="tsMetricHint">Save drafts anytime. Submit once the week is complete.</div>
        </div>
      </section>

      {loadingWeek ? (
        <div className="card cardPad" style={{ marginTop: 14 }}>
          <div className="muted">Loading week…</div>
        </div>
      ) : (
        <div className="tsDays">
          {weekDays.map((day) => {
            const dayISO = toISODate(day);
            const dayRows = rows.filter((r) => r.entry_date === dayISO);

            return (
              <section key={dayISO} className="card cardPad tsDayCard">
                <div className="tsDayHeader">
                  <div>
                    <div className="tsDayTitle">
                      {formatShort(day)} <span className="muted">({dayISO})</span>
                    </div>
                    <div className="tsDayMeta">{dayRows.length} line{dayRows.length === 1 ? "" : "s"} • {(hoursByDay[dayISO] ?? 0).toFixed(2)} hrs tracked</div>
                  </div>
                  <div className="tsDayTools">
                    <div className="tsDayTotal">Day total: {(hoursByDay[dayISO] ?? 0).toFixed(2)} hrs</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPreviousDayInto(dayISO)}
                      disabled={busy || loadingWeek || weekStartISO === dayISO}
                      title="Copy the previous day into this day"
                    >
                      Copy previous day
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addLine(dayISO)}
                      disabled={isContractor && projects.length === 0}
                      title={isContractor && projects.length === 0 ? "Admin must assign a project first" : "Add a new line"}
                    >
                      + Add line
                    </Button>
                  </div>
                </div>

                <div className="tsGridHead">
                  <div>Project</div>
                  <div>In</div>
                  <div>Out</div>
                  <div>Lunch</div>
                  <div>Notes</div>
                  <div>Miles</div>
                  <div>Status</div>
                </div>

                {dayRows.length === 0 ? <div className="tsEmptyDay">No lines for this day yet. Add time when work starts.</div> : null}

                {dayRows.map((r) => {
                  const locked = r.status === "submitted" || r.status === "approved";
                  const rowHours = getRowHours(r);

                  return (
                    <div key={r.tempId} className="tsRowWrap">
                      <div className="tsLineMeta">
                        <span>{locked ? "Locked line" : "Editable line"}</span>
                        <strong>{rowHours.toFixed(2)} hrs</strong>
                      </div>
                      <div className="tsGridRow">
                        <div style={{ display: "grid", gap: 6 }}>
                          <select
                            className="input tsControl"
                            value={r.project_id}
                            disabled={locked || (isContractor && projects.length === 0)}
                            onChange={(e) => updateRow(r.tempId, { project_id: e.target.value })}
                          >
                            <option value="">Select…</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          {r.project_id ? (
                            <button type="button" className="pill" onClick={() => toggleFavoriteProject(r.project_id)} disabled={locked}>
                              {favoriteProjectIds.includes(r.project_id) ? "★ Favorite" : "☆ Save favorite"}
                            </button>
                          ) : null}
                        </div>

                        <input className="input tsControl" type="time" step={60} value={r.time_in} disabled={locked} onChange={(e) => updateRow(r.tempId, { time_in: e.target.value })} />

                        <input className="input tsControl" type="time" step={60} value={r.time_out} disabled={locked} onChange={(e) => updateRow(r.tempId, { time_out: e.target.value })} />

                        <input
                          className="input tsControl"
                          value={r.lunch_hours}
                          disabled={locked}
                          onChange={(e) => updateRow(r.tempId, { lunch_hours: Number(e.target.value) })}
                          type="number"
                          min="0"
                          step="0.25"
                        />

                        <input
                          className="input tsControl tsNotesInput"
                          value={r.notes}
                          disabled={locked}
                          onChange={(e) => updateRow(r.tempId, { notes: e.target.value })}
                          placeholder="What did you work on?"
                        />

                        <input
                          className="input tsControl"
                          value={r.mileage}
                          disabled={locked}
                          onChange={(e) => updateRow(r.tempId, { mileage: Number(e.target.value) })}
                          type="number"
                          min="0"
                          step="0.1"
                        />

                        <div className="tsStatusCell">
                          <StatusPill status={(r.status ?? "draft") as EntryStatus} />
                          {!locked ? (
                            <Button variant="danger" size="sm" className="tsRemoveBtn" onClick={() => removeLine(r.tempId)} title="Remove line" type="button">
                              ✕
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {r.status === "rejected" && r.rejection_reason ? (
                        <div className="tsRejectReason">
                          <span style={{ fontWeight: 900 }}>Rejected:</span> {r.rejection_reason}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

export default function SetuTrackPage() {
  return (
    <RequireOnboarding>
      <SetuTrackInner />
    </RequireOnboarding>
  );
}
