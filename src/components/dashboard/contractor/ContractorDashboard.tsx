"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CardPad } from "../../ui/Card";
import { StatCard } from "../../ui/StatCard";
import { apiJson } from "../../../lib/api/client";
import { MetricsRow } from "../../ui/MetricsRow";
import { StatusChip } from "../../ui/StatusChip";

function monthStartISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function monthEndISO(startISO: string) {
  const [y, m] = startISO.split("-").map((x) => Number(x));
  const end = new Date(Date.UTC(y, m, 0));
  const yyyy = end.getUTCFullYear();
  const mm = String(end.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(end.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function money(x: number) {
  return Number(x || 0).toFixed(2);
}

export default function ContractorDashboard({ userId, hourlyRate }: { userId: string; hourlyRate: number }) {
  const router = useRouter();

  const periodStart = useMemo(() => monthStartISO(new Date()), []);
  const periodEnd = useMemo(() => monthEndISO(periodStart), [periodStart]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      setMsg("");
      try {
        const res = await apiJson<any>("/api/contractor/my-pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
        });
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load contractor dashboard");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [periodStart, periodEnd]);

  const approvedHours = Number(data?.totals?.approved_hours || 0);
  const approvedPay = Number(data?.totals?.approved_amount || 0);
  const pendingCount = Number(data?.totals?.pending_count || 0);
  const lastClosedPay = Number(data?.last_closed?.total_amount || 0);

  const pendingEntries = Array.isArray(data?.pending_entries) ? data.pending_entries : [];
  const submittedCount = pendingEntries.filter((row: any) => row.status === "submitted").length;
  const rejectedCount = pendingEntries.filter((row: any) => row.status === "rejected").length;
  const draftCount = pendingEntries.filter((row: any) => !row.status || row.status === "draft").length;
  const totalPendingHours = pendingEntries.reduce((sum: number, row: any) => sum + Number(row.hours_worked || 0), 0);
  const nextActionLabel = rejectedCount > 0
    ? "Fix rejected entries before they hold back your next payout."
    : draftCount > 0
      ? "Finish draft lines, then submit the full week once it is ready."
      : submittedCount > 0
        ? "Your submitted time is waiting for approval. No action is required unless a manager sends it back."
        : "You are clear for this period. Keep time up to date as work happens.";

  return (
    <>
      {msg ? (
        <div className="alert alertInfo">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
      ) : null}

      <MetricsRow>
        <StatCard label="Approved this month" value={`${approvedHours.toFixed(2)} hrs`} hint={`${periodStart} → ${periodEnd}`} />
        <StatCard label="Approved pay" value={`$${money(approvedPay)}`} hint="Approved hours only — pending entries are excluded." />
        <StatCard label="Needs action" value={`${rejectedCount + draftCount}`} hint={rejectedCount > 0 ? `${rejectedCount} rejected` : draftCount > 0 ? `${draftCount} draft` : "All clear"} />
        <StatCard label="Waiting for approval" value={`${submittedCount}`} hint={submittedCount ? `${totalPendingHours.toFixed(2)} hrs submitted` : "No submitted entries waiting"} />
      </MetricsRow>

      <div className="setuSummaryStrip">
        <div className="setuSummaryStripItem">
          <span>What matters now</span>
          <strong>{rejectedCount > 0 ? "Fix returned time" : draftCount > 0 ? "Finish this week" : submittedCount > 0 ? "Awaiting review" : "All clear"}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Next step</span>
          <strong>{rejectedCount > 0 ? "Edit and resubmit" : draftCount > 0 ? "Save then submit" : submittedCount > 0 ? "Watch approvals" : "Keep logging daily"}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Last closed payout</span>
          <strong>{data?.last_closed ? `$${money(lastClosedPay)}` : "—"}</strong>
        </div>
        <div className="setuSummaryStripItem">
          <span>Rate on file</span>
          <strong>{hourlyRate > 0 ? `$${money(hourlyRate)}/hr` : "Missing"}</strong>
        </div>
      </div>

      <CardPad className="dbPayCard" style={{ marginTop: 14 }}>
        <div className="dbPayHeader">
          <div>
            <div className="dbPayTitle">Your pay and work status</div>
            <div className="muted">{nextActionLabel}</div>
          </div>
          <div className="dbPayValue">${money(approvedPay)}</div>
        </div>

        <div className="setuMiniTable" style={{ marginTop: 14 }}>
          <div className="setuMiniRow"><span>Rejected entries to fix</span><strong>{rejectedCount}</strong></div>
          <div className="setuMiniRow"><span>Draft entries not yet submitted</span><strong>{draftCount}</strong></div>
          <div className="setuMiniRow"><span>Submitted and waiting for approval</span><strong>{submittedCount}</strong></div>
          <div className="setuMiniRow"><span>Approved pay in this range</span><strong>${money(approvedPay)}</strong></div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="pill" onClick={() => router.push("/timesheet")}>{rejectedCount > 0 || draftCount > 0 ? "Open My work" : "Enter time"}</button>
          <button className="pill" onClick={() => router.push("/pay/my-pay")}>Open My Pay</button>
        </div>
      </CardPad>

      <CardPad style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Pending entries</div>
            <div className="muted">Fix drafts, resubmit rejected, and wait for approvals.</div>
          </div>
          <div className="muted">{pendingCount ? `${pendingCount} pending` : "All clear ✅"}</div>
        </div>

        {busy ? (
          <div className="muted" style={{ marginTop: 10 }}>Loading…</div>
        ) : data?.pending_entries?.length ? (
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.pending_entries.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.entry_date}</td>
                    <td>{r.project_name || r.project_id}</td>
                    <td>{Number(r.hours_worked || 0).toFixed(2)}</td>
                    <td>
                      <StatusChip
                        state={
                          r.status === "approved"
                            ? "approved"
                            : r.status === "submitted"
                              ? "submitted"
                              : r.status === "rejected"
                                ? "rejected"
                                : "draft"
                        }
                        label={String(r.status || "draft")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10 }}>No pending entries for this month.</div>
        )}
      </CardPad>

      <CardPad style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Payout history</div>
            <div className="muted">Closed payroll runs that included you.</div>
          </div>
          <button className="pill" onClick={() => router.push("/reports/payroll")}>View payroll report</button>
        </div>

        {busy ? (
          <div className="muted" style={{ marginTop: 10 }}>Loading…</div>
        ) : data?.payout_history?.length ? (
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Hours</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payout_history.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.period_start} → {r.period_end}</td>
                    <td>{Number(r.total_hours || 0).toFixed(2)}</td>
                    <td>{r.currency} ${money(r.total_amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10 }}>No payouts yet.</div>
        )}
      </CardPad>
    </>
  );
}
