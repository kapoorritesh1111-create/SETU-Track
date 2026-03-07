import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/api/gates";

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => ({}));
    const period_start = String(body?.period_start || "");
    const period_end = String(body?.period_end || "");

    if (!period_start || !period_end) {
      return NextResponse.json({ ok: false, error: "Missing period_start/period_end" }, { status: 400 });
    }

    const { supa, profile } = gate;

    const { data, error } = await supa.rpc("close_payroll_period", {
      p_period_start: period_start,
      p_period_end: period_end,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    const runId = String(data || "");

    const { data: runRow } = await supa
      .from("payroll_runs")
      .select("id, total_hours, total_amount, currency")
      .eq("id", runId)
      .maybeSingle();

    try {
      await supa.from("audit_log").insert({
        org_id: profile.org_id,
        actor_id: profile.id,
        action: "payroll_run_locked",
        entity_type: "payroll_run",
        entity_id: runId || null,
        metadata: {
          period_start,
          period_end,
          total_hours: Number((runRow as any)?.total_hours || 0),
          total_amount: Number((runRow as any)?.total_amount || 0),
          currency: (runRow as any)?.currency || "USD",
        },
      });
    } catch {}

    try {
      await supa.from("payroll_snapshots").insert({
        org_id: profile.org_id,
        payroll_run_id: runId || null,
        snapshot_key: `run:${runId || `${period_start}:${period_end}`}`,
        period_start,
        period_end,
        total_hours: Number((runRow as any)?.total_hours || 0),
        total_amount: Number((runRow as any)?.total_amount || 0),
        currency: (runRow as any)?.currency || "USD",
        created_by: profile.id,
        metadata: { level: "org_period" },
      });
    } catch {}

    return NextResponse.json({ ok: true, run_id: runId || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
