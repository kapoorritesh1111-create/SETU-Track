import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/api/gates";
import { buildPayrollCloseChecklist } from "../../../../lib/domain/payroll/closeChecklist";

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => ({}));
    const period_start = String(body?.period_start || "");
    const period_end = String(body?.period_end || "");
    if (!period_start || !period_end) {
      return NextResponse.json({ ok: false, error: "period_start and period_end are required" }, { status: 400 });
    }

    const { supa, profile } = gate;
    const { data: blockers, error: blockersErr } = await supa.rpc("payroll_close_blockers", {
      p_period_start: period_start,
      p_period_end: period_end,
    });
    if (blockersErr) return NextResponse.json({ ok: false, error: blockersErr.message }, { status: 400 });

    const { data: profiles, error: profilesErr } = await supa
      .from("profiles")
      .select("id, full_name, role, hourly_rate, is_active, onboarding_completed_at")
      .eq("org_id", profile.org_id)
      .eq("role", "contractor");
    if (profilesErr) return NextResponse.json({ ok: false, error: profilesErr.message }, { status: 400 });

    const missingRates = (profiles || []).filter((row: any) => Number(row.hourly_rate || 0) <= 0).length;
    const incompleteProfiles = (profiles || []).filter((row: any) => !(row.full_name && row.onboarding_completed_at && row.is_active !== false && Number(row.hourly_rate || 0) > 0)).length;

    const { count: pendingEntries, error: pendingErr } = await supa
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("org_id", profile.org_id)
      .gte("entry_date", period_start)
      .lte("entry_date", period_end)
      .in("status", ["draft", "submitted"]);
    if (pendingErr) return NextResponse.json({ ok: false, error: pendingErr.message }, { status: 400 });

    const checklist = buildPayrollCloseChecklist({
      blockers: (blockers || []) as any,
      missingRates,
      incompleteProfiles,
      pendingEntries: Number(pendingEntries || 0),
    });

    return NextResponse.json({ ok: true, period_start, period_end, ...checklist, blockers: blockers || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
