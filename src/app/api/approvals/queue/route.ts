import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "../../../../lib/api/gates";
import { buildApprovalQueue } from "../../../../lib/domain/approvals/queue";

export async function GET(req: Request) {
  try {
    const gate = await requireManagerOrAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const { supa, profile } = gate;
    const url = new URL(req.url);
    const allPending = url.searchParams.get("all_pending") === "1";
    const weekStart = url.searchParams.get("week_start") || "";
    const weekEnd = url.searchParams.get("week_end") || "";
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();

    const fromISO = allPending
      ? new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : weekStart;
    const toISO = allPending
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : weekEnd;

    const profilesQuery = supa
      .from("profiles")
      .select("id, full_name, role, manager_id, hourly_rate, is_active, onboarding_completed_at")
      .eq("org_id", profile.org_id);

    const { data: allProfiles, error: profilesErr } = profile.role === "admin"
      ? await profilesQuery
      : await profilesQuery.eq("manager_id", profile.id);
    if (profilesErr) return NextResponse.json({ ok: false, error: profilesErr.message }, { status: 400 });

    const profilesById = Object.fromEntries((allProfiles || []).map((row: any) => [row.id, row]));
    const allowedUserIds = profile.role === "admin" ? null : Object.keys(profilesById);
    if (profile.role !== "admin" && (!allowedUserIds || allowedUserIds.length === 0)) {
      return NextResponse.json({ ok: true, groups: [], totals: { groups: 0, entries: 0, hours: 0, flagged_groups: 0 } });
    }

    const { data: projectsRaw, error: projectsErr } = await supa
      .from("projects")
      .select("id, name")
      .eq("org_id", profile.org_id);
    if (projectsErr) return NextResponse.json({ ok: false, error: projectsErr.message }, { status: 400 });
    const projectNamesById = Object.fromEntries((projectsRaw || []).map((row: any) => [row.id, row.name || "Untitled project"]));

    let entriesQuery = supa
      .from("v_time_entries")
      .select("id, user_id, entry_date, project_id, notes, status, hours_worked, full_name, project_name, time_in, time_out, hourly_rate_snapshot")
      .eq("org_id", profile.org_id)
      .eq("status", "submitted")
      .gte("entry_date", fromISO)
      .lte("entry_date", toISO)
      .order("entry_date", { ascending: false });

    if (allowedUserIds) entriesQuery = entriesQuery.in("user_id", allowedUserIds);

    const { data: entriesRaw, error: entriesErr } = await entriesQuery;
    if (entriesErr) return NextResponse.json({ ok: false, error: entriesErr.message }, { status: 400 });

    const entries = (entriesRaw || []).filter((entry: any) => {
      if (!search) return true;
      const hay = [entry.full_name, entry.project_name, entry.notes, entry.entry_date].join(" ").toLowerCase();
      return hay.includes(search);
    });

    let eventsRaw: any[] | null = null;
    try {
      const resp = await supa
        .from("approval_events")
        .select("user_id, week_start, created_at, action, note, actor_name")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(200);
      eventsRaw = (resp.data as any[] | null) || null;
    } catch {}

    const notesHistoryByUserWeek = (eventsRaw || []).reduce<Record<string, Array<{ at: string; actor_name: string | null; note: string | null; action: string }>>>((acc, row: any) => {
      const key = `${row.user_id}|${row.week_start}`;
      if (!acc[key]) acc[key] = [];
      if (acc[key].length < 4) {
        acc[key].push({ at: row.created_at, actor_name: row.actor_name || null, note: row.note || null, action: row.action || "approved" });
      }
      return acc;
    }, {});

    const groups = buildApprovalQueue({ entries: entries as any, profilesById: profilesById as any, projectNamesById, notesHistoryByUserWeek });
    const totals = {
      groups: groups.length,
      entries: entries.length,
      hours: groups.reduce((sum, group) => sum + group.total_hours, 0),
      flagged_groups: groups.filter((group) => group.anomalies.length > 0).length,
    };

    return NextResponse.json({ ok: true, groups, totals });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
