"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";
import { apiJson } from "../../../lib/api/client";
import { presetToRange } from "../../../lib/dateRanges";
import { CardPad } from "../../ui/Card";
import { SectionHeader } from "../../ui/SectionHeader";
import { EmptyState } from "../../ui/EmptyState";
import { StatusChip } from "../../ui/StatusChip";
import WorkspaceKpiStrip from "../../setu/WorkspaceKpiStrip";

type Contractor = { id: string; full_name: string | null; hourly_rate: number | null };
type VRow = {
  user_id: string;
  full_name?: string | null;
  hours_worked: number | null;
  hourly_rate_snapshot?: number | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  entry_date: string;
};

type AdminSummary = {
  total_hours: number;
  total_amount: number;
  pending_entries: number;
  active_contractors: number;
  payroll_state?: string;
  payroll_run_id?: string | null;
  closed_at?: string | null;
  paid_at?: string | null;
  currency?: string;
};

type FinancialPayload = {
  ok: true;
  analytics: {
    total_payroll: number;
    total_hours: number;
    budget_used: number;
    budget_remaining: number;
    budget_risk_alerts: number;
    incomplete_profiles: number;
    payroll_variance: { delta: number; pct: number };
    export_history_count: number;
  };
  project_budgets: Array<{
    project_id: string;
    project_name: string;
    budget_amount: number;
    payroll_cost: number;
    remaining_budget: number;
    billing_rate: number;
    risk: string;
    currency: string;
  }>;
  profile_completeness: Array<{
    contractor_id: string;
    contractor_name: string;
    score: number;
    missing: string[];
    payroll_missing: string[];
  }>;
};

function money(x: number) {
  return x.toFixed(2);
}

function monthLabel(startISO: string) {
  const d = new Date(`${startISO}T00:00:00`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function pctChange(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / previous) * 100;
}

function riskState(risk: string): "approved" | "open" | "submitted" | "rejected" | "draft" {
  if (risk === "healthy") return "approved";
  if (risk === "watch") return "open";
  if (risk === "high") return "submitted";
  if (risk === "over") return "rejected";
  return "draft";
}

function riskLabel(risk: string) {
  if (risk === "healthy") return "Healthy";
  if (risk === "watch") return "Watch";
  if (risk === "high") return "At risk";
  if (risk === "over") return "Over budget";
  return "Untracked";
}

export default function AdminDashboard({ orgId }: { orgId: string; userId: string }) {
  const router = useRouter();
  const [preset, setPreset] = useState<"current_month" | "last_month">("current_month");
  const range = useMemo(() => presetToRange(preset, "sunday"), [preset]);
  const currentMonthRange = useMemo(() => presetToRange("current_month", "sunday"), []);
  const previousMonthRange = useMemo(() => presetToRange("last_month", "sunday"), []);
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [rows, setRows] = useState<VRow[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [currentMonthSummary, setCurrentMonthSummary] = useState<AdminSummary | null>(null);
  const [previousMonthSummary, setPreviousMonthSummary] = useState<AdminSummary | null>(null);
  const [financials, setFinancials] = useState<FinancialPayload | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [blockerTotals, setBlockerTotals] = useState<{ entries: number; hours: number; amount: number } | null>(null);
  const [closeChecklist, setCloseChecklist] = useState<Array<{ key: string; label: string; status: "pass" | "warn"; count: number; detail?: string }>>([]);
  const [periodLocked, setPeriodLocked] = useState(false);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setStartDate(range.start);
    setEndDate(range.end);
  }, [range.start, range.end]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ period_start: startDate, period_end: endDate });
        const r = await apiJson<{ ok: boolean; locked: boolean; locked_at: string | null }>(`/api/pay-period/status?${qs.toString()}`);
        if (cancelled) return;
        setPeriodLocked(!!r.locked);
        setLockedAt(r.locked_at);
      } catch {
        if (cancelled) return;
        setPeriodLocked(false);
        setLockedAt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setMsg("");
      try {
        const [{ data: cons, error: consErr }, { data: r, error: rErr }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,full_name,hourly_rate")
            .eq("org_id", orgId)
            .eq("role", "contractor")
            .eq("is_active", true)
            .order("full_name", { ascending: true }),
          supabase
            .from("v_time_entries")
            .select("user_id,full_name,hours_worked,hourly_rate_snapshot,status,entry_date")
            .eq("org_id", orgId)
            .gte("entry_date", startDate)
            .lte("entry_date", endDate),
        ]);
        if (cancelled) return;
        if (consErr) throw consErr;
        if (rErr) throw rErr;
        setContractors(((cons as any) ?? []) as Contractor[]);
        setRows(((r as any) ?? []) as VRow[]);
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary(period_start: string, period_end: string) {
      const res = await apiJson<{ ok: true; summary: AdminSummary }>("/api/dashboard/admin-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_start, period_end }),
      });
      return res.summary || null;
    }

    (async () => {
      try {
        const [selected, currentMonth, previousMonth, financial] = await Promise.all([
          fetchSummary(startDate, endDate),
          fetchSummary(currentMonthRange.start, currentMonthRange.end),
          fetchSummary(previousMonthRange.start, previousMonthRange.end),
          apiJson<FinancialPayload>(`/api/dashboard/financial-intelligence?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`),
        ]);
        if (cancelled) return;
        setSummary(selected);
        setCurrentMonthSummary(currentMonth);
        setPreviousMonthSummary(previousMonth);
        setFinancials(financial);
      } catch {
        if (cancelled) return;
        setSummary(null);
        setCurrentMonthSummary(null);
        setPreviousMonthSummary(null);
        setFinancials(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, currentMonthRange.start, currentMonthRange.end, previousMonthRange.start, previousMonthRange.end]);

  const { approvedHours, approvedPay, pendingCount, submittedHours } = useMemo(() => {
    let ah = 0;
    let ap = 0;
    let pc = 0;
    let sh = 0;
    for (const r of rows) {
      const h = Number(r.hours_worked ?? 0);
      const rate = Number(r.hourly_rate_snapshot ?? 0);
      if (r.status === "approved") {
        ah += h;
        ap += h * rate;
      }
      if (r.status === "submitted") {
        pc += 1;
        sh += h;
      }
    }
    return { approvedHours: ah, approvedPay: ap, pendingCount: pc, submittedHours: sh };
  }, [rows]);

  const contractorCards = useMemo(() => {
    const map = new Map<string, { id: string; name: string; hours: number; rate: number; pay: number; status: "Ready" | "Pending" }>();
    for (const c of contractors) {
      map.set(c.id, {
        id: c.id,
        name: c.full_name || "(no name)",
        hours: 0,
        rate: Number(c.hourly_rate ?? 0),
        pay: 0,
        status: "Ready",
      });
    }
    for (const r of rows) {
      if (!map.has(r.user_id)) continue;
      const item = map.get(r.user_id)!;
      const h = Number(r.hours_worked ?? 0);
      const rate = Number(r.hourly_rate_snapshot ?? item.rate);
      if (r.status === "approved") {
        item.hours += h;
        item.pay += h * rate;
        item.rate = rate;
      }
      if (r.status === "submitted") item.status = "Pending";
    }
    return Array.from(map.values()).sort((a, b) => b.pay - a.pay).slice(0, 6);
  }, [contractors, rows]);

  const currentPayroll = Number(currentMonthSummary?.total_amount ?? 0);
  const previousPayroll = Number(previousMonthSummary?.total_amount ?? 0);
  const payrollDeltaPct = pctChange(currentPayroll, previousPayroll);
  const currency = summary?.currency || currentMonthSummary?.currency || "USD";
  const readinessState = periodLocked ? "approved" : pendingCount ? "submitted" : "open";
  const readinessLabel = periodLocked ? "Locked" : pendingCount ? "Needs review" : "Ready";

  async function previewClose() {
    setPreviewBusy(true);
    setMsg("");
    try {
      const json = await apiJson<any>("/api/pay-period/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_start: startDate, period_end: endDate }),
      });
      setBlockerTotals(json.totals || null);
      setCloseChecklist(json.checklist?.items || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to preview payroll close.");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function closePayroll() {
    const yes = window.confirm(`Lock payroll for ${startDate} → ${endDate}? This snapshots approved entries for payroll.`);
    if (!yes) return;
    setClosing(true);
    setMsg("");
    try {
      await apiJson("/api/pay-period/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_start: startDate, period_end: endDate }),
      });
      setMsg("Payroll locked ✅");
      setPeriodLocked(true);
      await previewClose();
    } catch (e: any) {
      setMsg(e?.message || "Failed to lock payroll.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="setuReportPage setuPageNarrow">
      {msg ? (
        <div className="alert alertInfo">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
      ) : null}

      <div className="setuHeroCard dashboardHeroCard dashboardHeroCardCompact">
        <div className="analyticsHeroCopy">
          <div className="setuSectionEyebrow">Admin command center</div>
          <h2>See readiness, payroll cost, and project risk before closing the period.</h2>
          <p>
            The dashboard is intentionally lighter: top controls first, current exceptions second, and budget or profile risk pushed into supporting panels.
          </p>
        </div>
        <div className="dashboardHeroControls">
          <label className="setuField" style={{ minWidth: 180 }}>
            <span>Reporting period</span>
            <select className="input" value={preset} onChange={(e) => setPreset(e.target.value as any)}>
              <option value="current_month">Current month</option>
              <option value="last_month">Last month</option>
            </select>
          </label>
          <div className="setuHeroActions">
            <button className="btn btnSecondary btnMd" onClick={previewClose} disabled={previewBusy}>{previewBusy ? "Checking…" : "Preview close"}</button>
            <button className="btn btnPrimary btnMd" onClick={closePayroll} disabled={closing || periodLocked}>{periodLocked ? "Locked" : closing ? "Locking…" : "Lock payroll"}</button>
          </div>
          <div className="dashboardScopeMeta">
            <span className="pill">{startDate} → {endDate}</span>
            <StatusChip state={readinessState} label={readinessLabel} />
            {periodLocked && lockedAt ? <span className="pill ok">Locked {new Date(lockedAt).toLocaleDateString()}</span> : null}
          </div>
        </div>
      </div>

      <WorkspaceKpiStrip
        items={[
          { label: "Payroll in view", value: `${currency} ${money(Number(financials?.analytics.total_payroll || summary?.total_amount || 0))}`, hint: `${approvedHours.toFixed(2)} approved hrs` },
          { label: "Pending approvals", value: String(pendingCount), hint: `${submittedHours.toFixed(2)} submitted hrs awaiting review` },
          { label: "Month variance", value: `${payrollDeltaPct >= 0 ? "+" : ""}${payrollDeltaPct.toFixed(1)}%`, hint: `Compared with ${monthLabel(previousMonthRange.start)}` },
          { label: "Budget alerts", value: String(financials?.analytics.budget_risk_alerts || 0), hint: `${financials?.analytics.incomplete_profiles || 0} profile blockers` },
        ]}
      />

      <div className="setuContentGrid dashboardCommandGrid">
        <CardPad className="setuWorkspaceCard">
          <SectionHeader title="Operational focus" subtitle="Resolve blockers before finance closes the period." />
          <div className="setuMiniStatGrid dashboardMiniStatGrid" style={{ marginTop: 14 }}>
            <div className="setuMiniStat"><span>Approvals pending</span><strong>{pendingCount}</strong><small>Submitted entries in queue</small></div>
            <div className="setuMiniStat"><span>Active contractors</span><strong>{summary?.active_contractors ?? contractors.length}</strong><small>Workers contributing in period</small></div>
            <div className="setuMiniStat"><span>Missing profile data</span><strong>{financials?.analytics.incomplete_profiles || 0}</strong><small>Payroll-required fields missing</small></div>
            <div className="setuMiniStat"><span>Export receipts</span><strong>{financials?.analytics.export_history_count || 0}</strong><small>Tracked payroll export history</small></div>
          </div>

          <div className="dashboardFocusGrid" style={{ marginTop: 16 }}>
            <div className="dashboardQuickActions">
              <button className="dbQuickBtn" onClick={() => router.push("/approvals")}>
                <strong>Review approvals</strong>
                <span className="muted">Move submitted time into approved payroll-ready state.</span>
              </button>
              <button className="dbQuickBtn" onClick={() => router.push("/reports/payroll")}>
                <strong>Open payroll report</strong>
                <span className="muted">Review projects, contractors, exports, and paid status.</span>
              </button>
              <button className="dbQuickBtn" onClick={() => router.push("/reports/payroll-runs")}>
                <strong>Review payroll runs</strong>
                <span className="muted">Audit closed periods, exports, and finance confirmation.</span>
              </button>
            </div>

            <div className="dashboardChecklistPanel">
              <div className="label">Close checklist</div>
              {closeChecklist.length ? (
                <div className="analyticsList analyticsListDense dashboardChecklistList">
                  {closeChecklist.slice(0, 4).map((item) => (
                    <div key={item.key} className="analyticsListItem">
                      <div>
                        <div className="analyticsListTitle">{item.label}</div>
                        <div className="analyticsListMeta">{item.detail || "Preview check against payroll close requirements."}</div>
                      </div>
                      <StatusChip state={item.status === "pass" ? "approved" : "rejected"} label={`${item.count}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 10 }}>Run “Preview close” to check payroll blockers before locking the period.</div>
              )}
            </div>
          </div>
        </CardPad>

        <div className="setuSideStack">
          <CardPad className="setuWorkspaceCard">
            <SectionHeader title="Financial picture" subtitle="Budget coverage, payroll totals, and current finance state." />
            <div className="setuListRows" style={{ marginTop: 14 }}>
              <div className="setuListRow"><div><strong>Approved payroll</strong><div className="muted">Entries approved and ready for lock</div></div><div className="setuListValue">{currency} {money(approvedPay)}</div></div>
              <div className="setuListRow"><div><strong>Budget used</strong><div className="muted">Tracked project budget burn in view</div></div><div className="setuListValue">{currency} {money(Number(financials?.analytics.budget_used || 0))}</div></div>
              <div className="setuListRow"><div><strong>Budget remaining</strong><div className="muted">Across tracked projects</div></div><div className="setuListValue">{currency} {money(Number(financials?.analytics.budget_remaining || 0))}</div></div>
              <div className="setuListRow"><div><strong>Closed snapshot</strong><div className="muted">Current period payroll state</div></div><div className="setuListValue">{summary?.payroll_state || (periodLocked ? "locked" : "open")}</div></div>
            </div>
            {blockerTotals ? (
              <div className="dashboardTotalsStrip">
                <span className="pill">{blockerTotals.entries} blocking entries</span>
                <span className="pill">{blockerTotals.hours.toFixed(2)} hours</span>
                <span className="pill">{currency} {money(blockerTotals.amount)} impacted</span>
              </div>
            ) : null}
          </CardPad>

          <CardPad className="setuWorkspaceCard">
            <SectionHeader title="Contractor readiness" subtitle="Highest payroll contributors and profile completeness." />
            <div className="analyticsList analyticsListDense" style={{ marginTop: 14 }}>
              {contractorCards.length ? contractorCards.map((item) => (
                <div key={item.id} className="analyticsListItem">
                  <div>
                    <div className="analyticsListTitle">{item.name}</div>
                    <div className="analyticsListMeta">{item.hours.toFixed(2)} hrs • Rate {currency} {money(item.rate)}</div>
                  </div>
                  <div className="analyticsRightStack">
                    <strong>{currency} {money(item.pay)}</strong>
                    <StatusChip state={item.status === "Ready" ? "approved" : "submitted"} label={item.status} />
                  </div>
                </div>
              )) : <div className="muted">No contractor payroll in range yet.</div>}
            </div>
          </CardPad>
        </div>
      </div>

      <div className="setuContentGrid dashboardBottomGrid">
        <CardPad>
          <SectionHeader title="Project budget watchlist" subtitle="Current payroll cost against tracked budgets." />
          {financials?.project_budgets?.length ? (
            <div className="analyticsList analyticsListDense" style={{ marginTop: 14 }}>
              {financials.project_budgets.slice(0, 6).map((row) => {
                const pct = row.budget_amount > 0 ? Math.min(100, Math.round((row.payroll_cost / row.budget_amount) * 100)) : 0;
                return (
                  <div key={row.project_id} className="analyticsBudgetRow">
                    <div className="analyticsBudgetTop">
                      <div>
                        <div className="analyticsListTitle">{row.project_name}</div>
                        <div className="analyticsListMeta">Budget {row.currency} {money(row.budget_amount)} • Used {row.currency} {money(row.payroll_cost)} • Remaining {row.currency} {money(row.remaining_budget)}</div>
                      </div>
                      <StatusChip state={riskState(row.risk)} label={riskLabel(row.risk)} />
                    </div>
                    <div className="analyticsTrendTrack"><div className="analyticsTrendFill" style={{ width: `${Math.max(6, pct)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No tracked budgets yet" description="Add a budget and billing rate on the Projects page to activate budget intelligence." />
          )}
        </CardPad>

        <CardPad>
          <SectionHeader title="Profile readiness" subtitle="Payroll completeness score for active contractors." />
          {financials?.profile_completeness?.length ? (
            <div className="analyticsList analyticsListDense" style={{ marginTop: 14 }}>
              {financials.profile_completeness.slice(0, 6).map((row) => (
                <div key={row.contractor_id} className="analyticsListItem">
                  <div>
                    <div className="analyticsListTitle">{row.contractor_name}</div>
                    <div className="analyticsListMeta">{row.payroll_missing.length ? `Missing: ${row.payroll_missing.join(", ")}` : "Payroll-ready"}</div>
                  </div>
                  <StatusChip state={row.score === 100 ? "approved" : row.score >= 70 ? "submitted" : "rejected"} label={`${row.score}%`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 14 }}>No contractor profiles found.</div>
          )}
        </CardPad>
      </div>

      {busy ? <div className="card cardPad"><div className="muted">Loading dashboard data…</div></div> : null}
    </section>
  );
}
