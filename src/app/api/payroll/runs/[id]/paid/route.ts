import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/api/gates";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const runId = params?.id;
    if (!runId) {
      return NextResponse.json({ ok: false, error: "Missing run id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const paid = body?.paid === false ? false : true;
    const note =
      typeof body?.note === "string" && body.note.trim().length
        ? body.note.trim().slice(0, 2000)
        : null;

    const { supa, profile } = gate;

    // Validate run belongs to current org
    const { data: existingRun, error: existingErr } = await supa
      .from("payroll_runs")
      .select("id, org_id, period_start, period_end, paid_at, paid_by, paid_note")
      .eq("org_id", profile.org_id)
      .eq("id", runId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ ok: false, error: existingErr.message }, { status: 400 });
    }

    if (!existingRun?.id) {
      return NextResponse.json({ ok: false, error: "Payroll run not found" }, { status: 404 });
    }

    const patch: Record<string, any> = paid
      ? {
          paid_at: new Date().toISOString(),
          paid_by: profile.id,
          paid_note: note,
          status: "paid",
        }
      : {
          paid_at: null,
          paid_by: null,
          paid_note: null,
          status: "locked",
        };

    const { data: updatedRun, error: updateErr } = await supa
      .from("payroll_runs")
      .update(patch)
      .eq("org_id", profile.org_id)
      .eq("id", runId)
      .select(
        "id, period_start, period_end, status, created_at, total_hours, total_amount, currency, paid_at, paid_by, paid_note"
      )
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 400 });
    }

    // Also mirror paid status into project_exports for the same run period, org-wide.
    // This keeps payroll report + receipts aligned with payroll run actions.
    const runPeriodStart = String(existingRun.period_start || "");
    const runPeriodEnd = String(existingRun.period_end || "");

    if (runPeriodStart && runPeriodEnd) {
      const exportPatch: Record<string, any> = paid
        ? {
            is_paid: true,
            paid_at: patch.paid_at,
            paid_by: profile.id,
            paid_note: note,
          }
        : {
            is_paid: false,
            paid_at: null,
            paid_by: null,
            paid_note: null,
          };

      await supa
        .from("project_exports")
        .update(exportPatch)
        .eq("org_id", profile.org_id)
        .eq("period_start", runPeriodStart)
        .eq("period_end", runPeriodEnd);
    }

    return NextResponse.json({ ok: true, run: updatedRun }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
