"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/layout/AppShell";
import RequireOnboarding from "../../../components/auth/RequireOnboarding";
import { useProfile } from "../../../lib/useProfile";
import { getAccessToken } from "../../../lib/api/client";
import { apiJson } from "../../../lib/api/client";
import ActionMenu from "../../../components/ui/ActionMenu";
import { EmptyState } from "../../../components/ui/EmptyState";
import WorkspaceKpiStrip from "../../../components/setu/WorkspaceKpiStrip";
import { StatusChip } from "../../../components/ui/StatusChip";
import Button from "../../../components/ui/Button";

type Run = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  total_hours: number;
  total_amount: number;
  currency: string;
  paid_at?: string | null;
  paid_by?: string | null;
  paid_by_name?: string | null;
  paid_note?: string | null;
};

function money(x: number) {
  return x.toFixed(2);
}

function paidLabel(run: Run) {
  if (run.paid_at) return "Paid";
  return String(run.status || "").toLowerCase().includes("lock") || String(run.status || "").toLowerCase().includes("close") ? "Locked" : "Open";
}

function paidState(run: Run) {
  if (run.paid_at) return "paid";
  return String(run.status || "").toLowerCase().includes("lock") || String(run.status || "").toLowerCase().includes("close") ? "locked" : "open";
}

export default function PayrollRunsPage() {
  const { profile, loading } = useProfile();
  const [runs, setRuns] = useState<Run[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canView = profile?.role === "admin";

  async function downloadFromApi(path: string, fallbackName: string) {
    const token = await getAccessToken();
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        throw new Error(j?.error || `Export failed (${res.status})`);
      } catch {
        throw new Error(text || `Export failed (${res.status})`);
      }
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function reload() {
    const data = await apiJson<{ ok: true; runs: Run[] }>("/api/payroll/runs", { method: "GET" });
    setRuns(data.runs || []);
    setLoadedAt(new Date().toISOString());
  }

  async function updatePaid(run: Run, nextPaid: boolean) {
    const note = window.prompt(nextPaid ? "Paid note (optional)" : "Reason for marking unpaid (optional)", run.paid_note || "") || "";
    try {
      setBusyId(run.id);
      setMsg("");
      await apiJson(`/api/payroll/runs/${encodeURIComponent(run.id)}/paid`, {
        method: "POST",
        body: JSON.stringify({ paid: nextPaid, note }),
      });
      await reload();
    } catch (e: any) {
      setMsg(e?.message || "Failed to update paid status");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!canView) return;
      setMsg("");
      try {
        const data = await apiJson<{ ok: true; runs: Run[] }>("/api/payroll/runs", { method: "GET" });
        if (cancelled) return;
        setRuns(data.runs || []);
        setLoadedAt(new Date().toISOString());
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load payroll runs");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canView]);

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalHours = runs.reduce((a, r) => a + Number(r.total_hours || 0), 0);
    const currency = runs[0]?.currency || "USD";
    const totalAmount = runs.reduce((a, r) => a + Number(r.total_amount || 0), 0);
    const paidRuns = runs.filter((run) => !!run.paid_at).length;
    const lastClosed = [...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at;
    return { totalRuns, totalHours, currency, totalAmount, paidRuns, lastClosed };
  }, [runs]);

  const content = useMemo(() => {
    if (!canView) return <div className="card cardPad">Admins only.</div>;
    if (msg) return <div className="card cardPad">{msg}</div>;
    if (!runs.length) {
      return (
        <div className="card">
          <EmptyState
            title="No payroll runs yet"
            description="Close a pay period to generate an immutable payroll run you can audit, export, and mark paid later."
            action={<a className="pill btnPrimary" href="/reports/payroll">Go to payroll report</a>}
          />
        </div>
      );
    }

    return (
      <section className="setuReportPage setuPageNarrow">
        <div className="setuHeroCard billingHeroCard">
          <div className="analyticsHeroCopy">
            <div className="setuSectionEyebrow">Payroll run ledger</div>
            <h2>Closed runs, paid confirmation, and finance downloads stay visible in one ledger.</h2>
            <p>
              Every locked payroll period becomes an immutable run. Use the paid state here as the canonical signal for finance and export history.
            </p>
          </div>
          <div className="analyticsHeroMeta">
            <div className="analyticsHeroMetaCard">
              <span>Last refresh</span>
              <strong>{loadedAt ? new Date(loadedAt).toLocaleTimeString() : "—"}</strong>
            </div>
            <div className="analyticsHeroMetaCard">
              <span>Paid runs</span>
              <strong>{stats.paidRuns}</strong>
            </div>
            <div className="analyticsHeroMetaCard">
              <span>Latest close</span>
              <strong>{stats.lastClosed ? new Date(stats.lastClosed).toLocaleDateString() : "—"}</strong>
            </div>
          </div>
        </div>

        <WorkspaceKpiStrip
          items={[
            { label: "Closed runs", value: String(stats.totalRuns), hint: "Immutable payroll snapshots" },
            { label: "Total hours", value: stats.totalHours.toFixed(2), hint: "Across all payroll runs" },
            { label: "Total amount", value: `${stats.currency} ${money(stats.totalAmount)}`, hint: "Run-backed payroll totals" },
            { label: "Paid runs", value: String(stats.paidRuns), hint: `${stats.totalRuns - stats.paidRuns} not yet paid` },
          ]}
        />

        <div className="setuDataSurface payrollRunsLedger">
          <div className="setuCardHeaderRow">
            <div>
              <div className="setuSectionTitle">Payroll runs</div>
              <div className="setuSectionHint">Use the paid badge as the canonical finance state for each run.</div>
            </div>
            <Button variant="secondary" onClick={() => void reload()}>Refresh</Button>
          </div>

          <div className="tableWrap">
            <table className="table setuRegisterTable">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Paid state</th>
                  <th>Hours</th>
                  <th>Amount</th>
                  <th>Closed</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const exportSummary = `/api/payroll/export?${new URLSearchParams({ mode: "summary", period_start: r.period_start, period_end: r.period_end }).toString()}`;
                  const exportDetail = `/api/payroll/export?${new URLSearchParams({ mode: "detail", period_start: r.period_start, period_end: r.period_end }).toString()}`;
                  const exportPdfSummary = `/api/payroll/export-pdf?${new URLSearchParams({ mode: "summary", period_start: r.period_start, period_end: r.period_end }).toString()}`;
                  const exportPdfDetail = `/api/payroll/export-pdf?${new URLSearchParams({ mode: "detail", period_start: r.period_start, period_end: r.period_end }).toString()}`;

                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.period_start} → {r.period_end}</strong>
                        <div className="muted">Run ID {r.id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <StatusChip status={paidState(r)} label={String(r.status || "Locked")} />
                      </td>
                      <td>
                        <div className="setuReceiptStack">
                          <span className={r.paid_at ? "pill ok" : "pill warn"}>{paidLabel(r)}</span>
                          <span className="setuMiniHint">
                            {r.paid_at
                              ? `${new Date(r.paid_at).toLocaleDateString()} • ${r.paid_by_name || r.paid_by || "—"}${r.paid_note ? ` • ${r.paid_note}` : ""}`
                              : "Awaiting finance confirmation"}
                          </span>
                        </div>
                      </td>
                      <td className="mono">{Number(r.total_hours || 0).toFixed(2)}</td>
                      <td className="mono">{r.currency} {money(Number(r.total_amount || 0))}</td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <a className="btn btnSecondary btnSm" href={`/reports/payroll-runs/${r.id}`}>View</a>
                        <span style={{ display: "inline-block", width: 6 }} />
                        {r.paid_at ? (
                          <button className="btn btnSecondary btnSm" type="button" disabled={busyId === r.id} onClick={() => updatePaid(r, false)}>
                            Mark unpaid
                          </button>
                        ) : (
                          <button className="btn btnPrimary btnSm" type="button" disabled={busyId === r.id} onClick={() => updatePaid(r, true)}>
                            Mark paid
                          </button>
                        )}
                        <span style={{ display: "inline-block", width: 6 }} />
                        <ActionMenu
                          trigger="pill"
                          triggerLabel="Downloads"
                          ariaLabel="Run downloads"
                          items={[
                            { label: "Download summary CSV", onSelect: () => downloadFromApi(exportSummary, `payroll_summary_${r.period_start}_to_${r.period_end}.csv`) },
                            { label: "Download detail CSV", onSelect: () => downloadFromApi(exportDetail, `payroll_detail_${r.period_start}_to_${r.period_end}.csv`) },
                            { label: "Download PDF (summary)", onSelect: () => downloadFromApi(exportPdfSummary, `payroll_summary_${r.period_start}_to_${r.period_end}.pdf`) },
                            { label: "Download PDF (detail)", onSelect: () => downloadFromApi(exportPdfDetail, `payroll_detail_${r.period_start}_to_${r.period_end}.pdf`) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }, [canView, loadedAt, msg, reload, runs, stats, busyId]);

  return (
    <RequireOnboarding>
      <AppShell title="Payroll runs" subtitle="Audit-grade history of closed payroll periods and paid state confirmation.">
        {loading ? <div className="card cardPad">Loading…</div> : content}
      </AppShell>
    </RequireOnboarding>
  );
}
