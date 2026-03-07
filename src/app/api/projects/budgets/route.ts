import { NextResponse } from "next/server";
import { requireManagerOrAdmin, requireAdmin } from "../../../../lib/api/gates";

export async function GET(req: Request) {
  try {
    const gate = await requireManagerOrAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    const { supa, profile } = gate;
    const { data, error } = await supa
      .from("project_budgets")
      .select("id,project_id,budget_amount,billing_rate,currency,cost_tracking_enabled,effective_from,effective_to,note")
      .eq("org_id", profile.org_id)
      .order("effective_from", { ascending: false });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, budgets: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    const { supa, profile } = gate;
    const body = await req.json().catch(() => ({} as any));
    const project_id = String(body?.project_id || "");
    if (!project_id) return NextResponse.json({ ok: false, error: "project_id is required" }, { status: 400 });

    const patch = {
      org_id: profile.org_id,
      project_id,
      budget_amount: Number(body?.budget_amount || 0),
      billing_rate: Number(body?.billing_rate || 0),
      currency: String(body?.currency || "USD"),
      cost_tracking_enabled: body?.cost_tracking_enabled === false ? false : true,
      effective_from: String(body?.effective_from || new Date().toISOString().slice(0, 10)),
      note: typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : null,
      created_by: profile.id,
    };

    const { data: existing } = await supa
      .from("project_budgets")
      .select("id")
      .eq("org_id", profile.org_id)
      .eq("project_id", project_id)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    let saved;
    if ((existing as any)?.id) {
      const { data, error } = await supa
        .from("project_budgets")
        .update(patch)
        .eq("id", (existing as any).id)
        .eq("org_id", profile.org_id)
        .select("id,project_id,budget_amount,billing_rate,currency,cost_tracking_enabled,effective_from,effective_to,note")
        .maybeSingle();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      saved = data;
    } else {
      const { data, error } = await supa
        .from("project_budgets")
        .insert(patch)
        .select("id,project_id,budget_amount,billing_rate,currency,cost_tracking_enabled,effective_from,effective_to,note")
        .maybeSingle();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      saved = data;
    }

    await supa.from("audit_log").insert({
      org_id: profile.org_id,
      actor_id: profile.id,
      action: "project_budget_updated",
      entity_type: "project",
      entity_id: project_id,
      metadata: saved,
    });

    return NextResponse.json({ ok: true, budget: saved });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
