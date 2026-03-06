import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../../lib/api/gates";

export async function POST(req: Request, ctx: { params: { projectId: string; exportId: string } }) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const { supa, profile } = gate;
    const { projectId, exportId } = ctx.params;
    const body = await req.json().catch(() => ({} as any));
    const is_paid = body?.is_paid === false ? false : true;
    const paid_note = String(body?.paid_note || "").slice(0, 2000);

    const patch: Record<string, any> = {
      is_paid,
      paid_note,
      paid_by: is_paid ? profile.id : null,
      paid_at: is_paid ? new Date().toISOString() : null,
    };

    const { data, error } = await supa
      .from("project_exports")
      .update(patch)
      .eq("id", exportId)
      .eq("project_id", projectId)
      .eq("org_id", profile.org_id)
      .select("id,is_paid,paid_by,paid_at,paid_note")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, export: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
