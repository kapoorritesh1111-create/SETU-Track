import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "../../../../lib/api/gates";
import { getWeekBounds } from "../../../../lib/domain/time/weekly";

type Item = { user_id: string; week_start: string; week_end: string };

export async function POST(req: Request) {
  try {
    const gate = await requireManagerOrAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const { supa, profile } = gate;
    const body = await req.json().catch(() => ({}));
    const entryIds = Array.isArray(body?.entry_ids) ? body.entry_ids.map(String).filter(Boolean) : [];
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : null;

    let items = (Array.isArray(body?.items) ? body.items : []) as Item[];

    if (!items.length && entryIds.length) {
      const { data: selectedEntries, error: selectedErr } = await supa
        .from("time_entries")
        .select("id, user_id, entry_date")
        .eq("org_id", profile.org_id)
        .in("id", entryIds);
      if (selectedErr) return NextResponse.json({ ok: false, error: selectedErr.message }, { status: 400 });
      const dedup = new Map<string, Item>();
      for (const row of selectedEntries || []) {
        const bounds = getWeekBounds(String((row as any).entry_date));
        const key = `${(row as any).user_id}|${bounds.week_start}`;
        dedup.set(key, { user_id: String((row as any).user_id), week_start: bounds.week_start, week_end: bounds.week_end });
      }
      items = Array.from(dedup.values());
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "items[] or entry_ids[] is required" }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ ok: false, error: "Too many approval groups (max 50)" }, { status: 400 });
    }

    if (profile.role === "manager") {
      const userIds = Array.from(new Set(items.map((item) => item.user_id)));
      const { data: reports, error: repErr } = await supa
        .from("profiles")
        .select("id, manager_id")
        .eq("org_id", profile.org_id)
        .in("id", userIds);
      if (repErr) return NextResponse.json({ ok: false, error: repErr.message }, { status: 400 });

      const allowed = new Set((reports || []).filter((row: any) => row.manager_id === profile.id).map((row: any) => row.id));
      for (const userId of userIds) {
        if (!allowed.has(userId)) {
          return NextResponse.json({ ok: false, error: "One or more selected users are not your direct reports" }, { status: 403 });
        }
      }
    }

    const ranges = Array.from(new Set(items.map((item) => `${item.week_start}__${item.week_end}`)));
    if (ranges.length) {
      const { data: locks, error: lockErr } = await supa
        .from("pay_periods")
        .select("period_start, period_end, locked")
        .eq("org_id", profile.org_id)
        .in("period_start", ranges.map((value) => value.split("__")[0]))
        .in("period_end", ranges.map((value) => value.split("__")[1]));
      if (lockErr) return NextResponse.json({ ok: false, error: lockErr.message }, { status: 400 });
      const lockedSet = new Set((locks || []).filter((row: any) => row.locked).map((row: any) => `${row.period_start}__${row.period_end}`));
      for (const value of ranges) {
        if (lockedSet.has(value)) {
          return NextResponse.json({ ok: false, error: `Pay period locked: ${value.replace("__", " → ")}` }, { status: 400 });
        }
      }
    }

    let totalApproved = 0;
    const eventRows: any[] = [];
    const auditRows: any[] = [];

    for (const item of items) {
      const { error, data } = await supa
        .from("time_entries")
        .update({ status: "approved" })
        .eq("org_id", profile.org_id)
        .eq("user_id", item.user_id)
        .gte("entry_date", item.week_start)
        .lte("entry_date", item.week_end)
        .eq("status", "submitted")
        .select("id");
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

      const approvedCount = data?.length ?? 0;
      totalApproved += approvedCount;
      if (approvedCount > 0) {
        eventRows.push({
          org_id: profile.org_id,
          user_id: item.user_id,
          week_start: item.week_start,
          week_end: item.week_end,
          action: "approved",
          note,
          actor_id: profile.id,
          actor_name: profile.full_name || null,
          entry_count: approvedCount,
        });
        auditRows.push({
          org_id: profile.org_id,
          actor_id: profile.id,
          action: "timesheet_approved",
          entity_type: "approval_group",
          metadata: {
            user_id: item.user_id,
            week_start: item.week_start,
            week_end: item.week_end,
            entry_count: approvedCount,
            note,
          },
        });
      }
    }

    if (eventRows.length) { try { await supa.from("approval_events").insert(eventRows); } catch {} }
    if (auditRows.length) { try { await supa.from("audit_log").insert(auditRows); } catch {} }

    return NextResponse.json({ ok: true, approved: totalApproved, groups: items.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
