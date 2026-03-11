"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";
import { CardPad } from "../../ui/Card";
import { StatCard } from "../../ui/StatCard";
import { presetToRange } from "../../../lib/dateRanges";
import { MetricsRow } from "../../ui/MetricsRow";

type DirectReport = {
  id: string;
  full_name: string | null;
  hourly_rate: number | null;
  is_active: boolean | null;
};

type SubmittedRow = {
  id: string;
  user_id: string;
  entry_date: string;
  hours_worked: number | null;
};

export default function ManagerDashboard({ orgId, userId }: { orgId: string; userId: string }) {
  const router = useRouter();

  const range = useMemo(() => presetToRange("current_month", "sunday"), []);
  const [pending, setPending] = useState(0);
  const [approvedHours, setApprovedHours] = useState(0);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [staleApprovals, setStaleApprovals] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMsg("");
      try {
        const { data: reports, error: reportsErr } = await supabase
          .from("profiles")
          .select("id, full_name, hourly_rate, is_active")
          .eq("org_id", orgId)
          .eq("manager_id", userId)
          .order("full_name", { ascending: true });
        if (reportsErr) throw reportsErr;

        const directReportRows = ((reports as any) ?? []) as DirectReport[];
        const directReportIds = directReportRows.map((row) => row.id);

        let submittedRows: SubmittedRow[] = [];
        let approvedRows: Array<{ hours_worked: number | null }> = [];

        if (directReportIds.length) {
          const { data: p, error: pErr } = await supabase
            .from("v_time_entries")
            .select("id, user_id, entry_date, hours_worked")
            .eq("org_id", orgId)
            .eq("status", "submitted")
            .in("user_id", directReportIds);
          if (pErr) throw pErr;
          submittedRows = (((p as any) ?? []) as SubmittedRow[]) || [];

          const { data: a, error: aErr } = await supabase
            .from("v_time_entries")
            .select("hours_worked")
            .eq("org_id", orgId)
            .gte("entry_date", range.start)
            .lte("entry_date", range.end)
            .eq("status", "approved")
            .in("user_id", directReportIds);
          if (aErr) throw aErr;
          approvedRows = (((a as any) ?? []) as Array<{ hours_worked: number | null }>) || [];
        }

        if (!cancelled) {
          setDirectReports(directReportRows);
          setPending(submittedRows.length);
          setApprovedHours(approvedRows.reduce((acc, row) => acc + Number(row.hours_worked ?? 0), 0));
          setStaleApprovals(
            submittedRows.filter((row) => ((Date.now() - new Date(`${row.entry_date}T00:00:00`).getTime()) / 86400000) > 2).length
          );
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load manager dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, range.end, range.start, userId]);

  const activeReports = directReports.filter((row) => row.is_active !== false).length;
  const missingRates = directReports.filter((row) => row.is_active !== false && !Number(row.hourly_rate ?? 0)).length;
  const nextAction = staleApprovals > 0
    ? "Review stale approvals first so payroll stays on track."
    : pending > 0
      ? "Clear submitted time from your review queue."
      : missingRates > 0
        ? "Complete missing contractor rates before the next payroll cycle."
        : "Your team queue is clear right now.";

  return (
    <>
      {msg ? (
        <div className="alert alertInfo">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
      ) : null}

      <MetricsRow>
        <StatCard label="Pending approvals" value={pending} hint="Submitted entries from your direct reports" />
        <StatCard label="Stale approvals" value={staleApprovals} hint="Submitted more than two days ago" />
        <StatCard label="Direct reports" value={activeReports} hint={`${directReports.length - activeReports} inactive or archived`} />
        <StatCard label="Approved hours" value={`${approvedHours.toFixed(2)} hrs`} hint={`${range.start} → ${range.end}`} />
      </MetricsRow>

      <div className="setuSummaryStrip">
        <div className="setuSummaryStripItem">
          <span>What matters now</span>
          <strong>{staleApprovals > 0 ? "Stale approvals" : pending > 0 ? "Review queue" : missingRates > 0 ? "Rate readiness" : "Queue clear"}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Next step</span>
          <strong>{staleApprovals > 0 ? "Review oldest first" : pending > 0 ? "Approve or send back" : missingRates > 0 ? "Fix missing rates" : "Monitor projects"}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Missing rates</span>
          <strong>{missingRates}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Coverage</span>
          <strong>{activeReports} active people</strong>
        </div>
      </div>

      <CardPad className="dbPayCard" style={{ marginTop: 14 } as any}>
        <div className="dbPayHeader">
          <div>
            <div className="dbPayTitle">Manager workflow</div>
            <div className="muted">{nextAction}</div>
          </div>
          <div className="dbPayValue">{pending > 0 ? `${pending} pending` : "Clear"}</div>
        </div>

        <div className="setuMiniTable" style={{ marginTop: 14 }}>
          <div className="setuMiniRow"><span>Submitted entries waiting for review</span><strong>{pending}</strong></div>
          <div className="setuMiniRow"><span>Stale items to review first</span><strong>{staleApprovals}</strong></div>
          <div className="setuMiniRow"><span>Direct reports missing rates</span><strong>{missingRates}</strong></div>
          <div className="setuMiniRow"><span>Approved hours this month</span><strong>{approvedHours.toFixed(2)} hrs</strong></div>
        </div>

        <div className="dbQuickGrid">
          <button className="dbQuickBtn" onClick={() => router.push("/approvals")}>Approvals<span className="muted">Review submitted time</span></button>
          <button className="dbQuickBtn" onClick={() => router.push("/profiles")}>People<span className="muted">Check rate and manager readiness</span></button>
          <button className="dbQuickBtn" onClick={() => router.push("/projects")}>Projects<span className="muted">Watch workstream cost and burn</span></button>
        </div>
      </CardPad>
    </>
  );
}
