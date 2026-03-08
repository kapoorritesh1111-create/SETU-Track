import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "../../../../lib/api/gates";

type ApiRow = {
  id: string;
  org_id: string;
  created_at: string;
  actor_id: string | null;
  actor_name_snapshot: string | null;
  export_type: string;
  file_format: string;
  scope: string;
  project_id: string | null;
  run_id: string | null;
  metadata: any;
};

function diffLabel(status: "same" | "changed" | "unknown") {
  return status === "same" ? "Matches previous" : status === "changed" ? "Updated since previous" : "Baseline export";
}

export async function GET(req: Request) {
  try {
    const gate = await requireManagerOrAdmin(req);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const { supa, profile } = gate;
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 80)));

    const [
      { data: events, error: eventsError },
      { data: projects, error: projectsError },
      { data: profiles, error: profilesError },
      { data: runs, error: runsError },
      { data: projectExports, error: projectExportsError },
    ] = await Promise.all([
      supa
        .from("export_events")
        .select("id,org_id,created_at,actor_id,actor_name_snapshot,export_type,file_format,scope,project_id,run_id,metadata")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(limit),
      supa.from("projects").select("id,name").eq("org_id", profile.org_id),
      supa.from("profiles").select("id,full_name").eq("org_id", profile.org_id),
      supa.from("payroll_runs").select("id,period_start,period_end,status").eq("org_id", profile.org_id),
      supa
        .from("project_exports")
        .select("id,project_id,period_start,period_end,payload_hash,total_hours,total_amount,currency,is_paid,paid_at,paid_by,paid_note")
        .eq("org_id", profile.org_id),
    ]);

    if (eventsError || projectsError || profilesError || runsError || projectExportsError) {
      const error = eventsError || projectsError || profilesError || runsError || projectExportsError;
      return NextResponse.json({ ok: false, error: error?.message || "Failed to load exports" }, { status: 400 });
    }

    const projectNameMap = new Map(((projects || []) as any[]).map((project) => [project.id, project.name || `Project ${String(project.id || "").slice(0, 8)}`]));
    const actorNameMap = new Map(((profiles || []) as any[]).map((person) => [person.id, person.full_name || `User ${String(person.id || "").slice(0, 8)}`]));
    const runMap = new Map(((runs || []) as any[]).map((run) => [run.id, run]));
    const projectExportMap = new Map(((projectExports || []) as any[]).map((item) => [item.id, item]));

    const exportHistoryByKey = new Map<string, string[]>();
    for (const item of ((projectExports || []) as any[]).sort((a, b) => String(b.period_start || "").localeCompare(String(a.period_start || "")) || String(b.period_end || "").localeCompare(String(a.period_end || "")))) {
      const key = `${item.project_id || "org"}|${item.period_start || ""}|${item.period_end || ""}`;
      const arr = exportHistoryByKey.get(key) || [];
      if (item.payload_hash) arr.push(String(item.payload_hash));
      exportHistoryByKey.set(key, arr);
    }

    const exports = ((events || []) as ApiRow[]).map((row) => {
      const linkedRun = row.run_id ? runMap.get(row.run_id) : null;
      const projectExportId = row.metadata?.project_export_id || row.metadata?.projectExportId || null;
      const linkedExport = projectExportId ? projectExportMap.get(projectExportId) : null;
      const periodStart = row.metadata?.period_start || linkedExport?.period_start || linkedRun?.period_start || null;
      const periodEnd = row.metadata?.period_end || linkedExport?.period_end || linkedRun?.period_end || null;
      const projectName = row.project_id
        ? projectNameMap.get(row.project_id) || row.metadata?.project_name || `Project ${String(row.project_id || "").slice(0, 8)}`
        : row.metadata?.project_name || null;
      const label = row.metadata?.label || row.export_type || "Export";
      const payloadHash = row.metadata?.payload_hash || linkedExport?.payload_hash || null;
      const historyKey = `${row.project_id || "org"}|${periodStart || ""}|${periodEnd || ""}`;
      const history = exportHistoryByKey.get(historyKey) || [];
      const previousHash = history.find((hash) => hash && hash !== payloadHash) || null;
      const diff_status: "same" | "changed" | "unknown" = payloadHash && previousHash ? (payloadHash === previousHash ? "same" : "changed") : "unknown";
      const isPaid = !!linkedExport?.is_paid || !!linkedExport?.paid_at;

      return {
        id: row.id,
        org_id: row.org_id,
        created_at: row.created_at,
        created_by: row.actor_id,
        actor_name: row.actor_name_snapshot || (row.actor_id ? actorNameMap.get(row.actor_id) || row.actor_id : null),
        type: row.export_type,
        label,
        project_id: row.project_id,
        project_name: projectName,
        payroll_run_id: row.run_id,
        project_export_id: projectExportId,
        payload_hash: payloadHash,
        diff_status,
        meta: {
          ...(row.metadata || {}),
          project_name: projectName,
          period_start: periodStart,
          period_end: periodEnd,
          period_label: periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : null,
          is_paid: isPaid,
          paid_at: linkedExport?.paid_at || null,
          paid_by: linkedExport?.paid_by || null,
          paid_note: linkedExport?.paid_note || null,
          total_hours: linkedExport?.total_hours ?? row.metadata?.total_hours ?? null,
          total_amount: linkedExport?.total_amount ?? row.metadata?.total_amount ?? null,
          currency: linkedExport?.currency ?? row.metadata?.currency ?? "USD",
          scope: row.scope,
          file_format: row.file_format,
          receipt_status_label: isPaid ? "Paid receipt" : projectExportId ? "Linked receipt" : "Audit receipt",
          diff_status_label: diffLabel(diff_status),
          payroll_run_status: linkedRun?.status || null,
        },
      };
    });

    return NextResponse.json({ ok: true, exports });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}
