import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAuditRow = {
  id: string;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown> | null;
};

export type ActivityExportRow = {
  id: string;
  export_type: string | null;
  file_format: string | null;
  scope: string | null;
  created_at: string | null;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown> | null;
};

export type ActivityPayrollRunRow = {
  id: string;
  created_at: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
  total_amount: number | null;
};

export async function getActivityData(client: SupabaseClient, orgId: string) {
  const auditQuery = client
    .from("audit_log")
    .select("id,action,entity_type,entity_id,created_at,actor_id,metadata")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(40);

  const exportQuery = client
    .from("export_events")
    .select("id,export_type,file_format,scope,created_at,period_start,period_end,metadata")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  const runQuery = client
    .from("payroll_runs")
    .select("id,created_at,period_start,period_end,status,total_amount")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  const [auditRes, exportRes, runRes] = await Promise.all([auditQuery, exportQuery, runQuery]);
  if (auditRes.error || exportRes.error || runRes.error) {
    throw new Error(auditRes.error?.message || exportRes.error?.message || runRes.error?.message || "Failed to load activity");
  }

  const rawAuditRows = ((auditRes.data || []) as ActivityAuditRow[]).map((row) => ({
    ...row,
    metadata: (row.metadata || null) as Record<string, unknown> | null,
  }));

  const actorIds = Array.from(
    new Set(rawAuditRows.map((row) => row.actor_id).filter((value): value is string => Boolean(value)))
  );

  let profileMap = new Map<string, { full_name: string | null }>();

  if (actorIds.length) {
    const { data: profileRows, error: profileErr } = await client
      .from("profiles")
      .select("id,full_name")
      .in("id", actorIds);

    if (profileErr) {
      throw new Error(profileErr.message || "Failed to load actor profiles");
    }

    profileMap = new Map(
      (profileRows || []).map((row: any) => [row.id, { full_name: row.full_name || null }])
    );
  }

  return {
    auditRows: rawAuditRows.map((row) => ({
      ...row,
      actor_name: row.actor_id ? profileMap.get(row.actor_id)?.full_name || null : null,
      actor_email: null,
    })),
    exportRows: ((exportRes.data || []) as ActivityExportRow[]).map((row) => ({
      ...row,
      metadata: (row.metadata || null) as Record<string, unknown> | null,
    })),
    runRows: (runRes.data || []) as ActivityPayrollRunRow[],
  };
}
