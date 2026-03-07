"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";
import { CardPad } from "../../ui/Card";
import { StatCard } from "../../ui/StatCard";
import { presetToRange } from "../../../lib/dateRanges";
import { MetricsRow } from "../../ui/MetricsRow";
import { apiJson } from "../../../lib/api/client";
import { StatusChip } from "../../ui/StatusChip";

export default function ManagerDashboard({ orgId }: { orgId: string; userId: string }) {
  const router = useRouter();

  const range = useMemo(() => presetToRange("current_month", "sunday"), []);
  const [pending, setPending] = useState(0);
  const [approvedHours, setApprovedHours] = useState(0);
  const [msg, setMsg] = useState("");
  const [financials, setFinancials] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMsg("");
      try {
        const [{ data: p, error: pErr }, { data: a, error: aErr }, financial] = await Promise.all([
          supabase.from("v_time_entries").select("id").eq("org_id", orgId).eq("status", "submitted"),
          supabase
            .from("v_time_entries")
            .select("hours_worked")
            .eq("org_id", orgId)
            .gte("entry_date", range.start)
            .lte("entry_date", range.end)
            .eq("status", "approved"),
          apiJson<any>(`/api/dashboard/financial-intelligence?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`),
        ]);
        if (!cancelled) {
          if (pErr) throw pErr;
          if (aErr) throw aErr;
          setPending(((p as any) ?? [])?.length ?? 0);
          const sum = (((a as any) ?? []) as any[]).reduce((acc, r) => acc + Number(r.hours_worked ?? 0), 0);
          setApprovedHours(sum);
          setFinancials(financial);
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load manager dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, range.start, range.end]);

  return (
    <>
      {msg ? (
        <div className="alert alertInfo">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
      ) : null}

      <MetricsRow>
        <StatCard label="Pending approvals" value={pending} hint="Submitted entries" />
        <StatCard label="Approved hours" value={`${approvedHours.toFixed(2)} hrs`} hint={`${range.start} → ${range.end}`} />
        <StatCard label="Payroll this month" value={`USD ${Number(financials?.analytics?.total_payroll || 0).toFixed(2)}`} hint="Locked-run backed totals" />
        <StatCard label="Incomplete profiles" value={`${financials?.analytics?.incomplete_profiles || 0}`} hint="Payroll blockers" />
      </MetricsRow>

      <CardPad className="dbPayCard" style={{ marginTop: 14 } as any}>
        <div className="dbPayHeader">
          <div>
            <div className="dbPayTitle">Operations command</div>
            <div className="muted">Approvals, payroll visibility, and financial readiness in one place.</div>
          </div>
          <div className="dbPayValue">Ready</div>
        </div>

        <div className="dbQuickGrid">
          <button className="dbQuickBtn" onClick={() => router.push("/approvals")}>Approvals<span className="muted">Review submissions</span></button>
          <button className="dbQuickBtn" onClick={() => router.push("/reports/payroll")}>Payroll<span className="muted">Analytics and exports</span></button>
          <button className="dbQuickBtn" onClick={() => router.push("/projects")}>Projects<span className="muted">Budget watchlist</span></button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {(financials?.project_budgets || []).slice(0, 4).map((row: any) => (
            <div key={row.project_id} className="row" style={{ justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{row.project_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Remaining {row.currency} {Number(row.remaining_budget || 0).toFixed(2)}
                </div>
              </div>
              <StatusChip state={row.risk === "healthy" ? "approved" : row.risk === "watch" ? "submitted" : "rejected"} label={row.risk} />
            </div>
          ))}
        </div>
      </CardPad>
    </>
  );
}
