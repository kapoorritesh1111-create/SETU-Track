"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/layout/AppShell";
import AdminTabs from "../../../components/admin/AdminTabs";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/DataTable";
import MetaFooter from "../../../components/ui/MetaFooter";
import { EmptyState } from "../../../components/ui/EmptyState";
import ExportReceiptDrawer from "../../../components/ui/ExportReceiptDrawer";
import { apiJson } from "../../../lib/api/client";
import WorkspaceKpiStrip from "../../../components/setu/WorkspaceKpiStrip";

type ExportReceipt = {
  id: string;
  org_id: string;
  created_at: string;
  created_by: string | null;
  actor_name: string | null;
  type: string;
  label: string | null;
  project_id: string | null;
  project_name?: string | null;
  payroll_run_id: string | null;
  project_export_id?: string | null;
  payload_hash: string | null;
  diff_status: "same" | "changed" | "unknown" | null;
  meta: any;
};

type Row = ExportReceipt;

function money(amount: number, currency = "USD") {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function isPaidReceipt(row: Row) {
  return !!row.meta?.is_paid || !!row.meta?.paid_at || String(row.meta?.payroll_run_status || "").toLowerCase() === "paid";
}

function diffClass(status: Row["diff_status"]) {
  if (status === "same") return "pill ok";
  if (status === "changed") return "pill warn";
  return "pill";
}

function receiptClass(row: Row) {
  if (isPaidReceipt(row)) return "pill ok";
  if (row.project_export_id) return "pill warn";
  return "pill";
}

export default function AdminExportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const json = await apiJson<{ ok: boolean; exports?: Row[]; error?: string }>("/api/exports/list");
      if (!json?.ok) throw new Error(json?.error || "Failed to load exports.");
      setRows((json.exports || []) as Row[]);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (showPaidOnly && !isPaidReceipt(row)) return false;
      if (!q) return true;
      return [
        row.label,
        row.type,
        row.project_name,
        row.project_id,
        row.meta?.period_label,
        row.actor_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, showPaidOnly, query]);

  const totals = useMemo(() => {
    const linked = rows.filter((row) => !!row.project_export_id).length;
    const paid = rows.filter((row) => isPaidReceipt(row)).length;
    const changed = rows.filter((row) => row.diff_status === "changed").length;
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.meta?.total_amount || 0), 0);
    return { linked, paid, changed, totalAmount };
  }, [rows]);

  const columns = useMemo(
    () =>
      [
        {
          key: "label",
          header: "Receipt",
          render: (r: Row) => (
            <div className="setuReceiptStack">
              <div className="setuExportTitle">{r.label || r.type}</div>
              <div className="setuExportMeta">{r.type} • {r.meta?.file_format?.toUpperCase?.() || "FILE"} • {r.meta?.scope || "org"}</div>
            </div>
          ),
        },
        {
          key: "project",
          header: "Project / Period",
          render: (r: Row) => (
            <div className="setuReceiptStack">
              <div style={{ fontWeight: 800 }}>{r.project_name || r.project_id || "Org-level export"}</div>
              <div className="setuMiniHint">{r.meta?.period_label || "No period linked"}</div>
              {r.meta?.total_amount ? (
                <div className="setuMiniHint">{money(Number(r.meta.total_amount || 0), r.meta?.currency || "USD")} • {Number(r.meta?.total_hours || 0).toFixed(2)} hrs</div>
              ) : null}
            </div>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (r: Row) => (
            <div className="setuStatusStack">
              <span className={receiptClass(r)}>{isPaidReceipt(r) ? "Paid receipt" : r.project_export_id ? "Linked receipt" : "Audit receipt"}</span>
              <span className={diffClass(r.diff_status)}>{r.meta?.diff_status_label || "Baseline export"}</span>
              {r.meta?.payroll_run_status ? <span className="setuMiniHint">Run: {r.meta.payroll_run_status}</span> : null}
            </div>
          ),
        },
        {
          key: "created",
          header: "Created",
          render: (r: Row) => (
            <div className="setuReceiptStack">
              <div>{new Date(r.created_at).toLocaleString()}</div>
              <div className="setuMiniHint">By {r.actor_name || r.created_by || "—"}</div>
            </div>
          ),
        },
        {
          key: "actions",
          header: "",
          render: (r: Row) => (
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(r);
                setOpen(true);
              }}
            >
              View receipt
            </Button>
          ),
        },
      ] as any,
    []
  );

  return (
    <AppShell
      title="Exports"
      subtitle="Audit receipts, client export linkage, and paid-state history across payroll operations."
      right={<Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>}
    >
      <section className="setuReportPage setuPageNarrow setuExportsPage">
        <AdminTabs active="exports" />

        <div className="setuFilterBar setuCompactToolbar">
          <div className="setuFilterBarTop">
            <div>
              <div className="setuSectionTitle">Receipt ledger</div>
              <div className="setuSectionHint">Every payroll export, linked project export, and audit artifact in one searchable table.</div>
            </div>
            <div className="setuFilterMeta">
              <span className="pill">{filteredRows.length} visible</span>
              <span className="pill">{totals.paid} paid</span>
              <span className="pill">{totals.linked} linked</span>
            </div>
          </div>
          <div className="setuViewToolbar">
            <div className="setuViewToolbarLeft">
              <input
                className="input setuToolbarSearch"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search receipt, project, period, or actor"
              />
              <button className={`pill ${showPaidOnly ? "ok" : ""}`} onClick={() => setShowPaidOnly((v) => !v)}>
                {showPaidOnly ? "Showing paid only" : "Show paid only"}
              </button>
            </div>
          </div>
        </div>

        <WorkspaceKpiStrip
          items={[
            { label: "Receipts", value: String(rows.length), hint: "Tracked export receipts" },
            { label: "Project-linked", value: String(totals.linked), hint: "End-to-end client export linkage" },
            { label: "Paid receipts", value: String(totals.paid), hint: "Paid or run-paid artifacts" },
            { label: "Export value", value: money(totals.totalAmount), hint: "Visible linked export totals" },
          ]}
        />

        {loading ? (
          <div className="card cardPad"><div className="muted">Loading…</div></div>
        ) : filteredRows.length === 0 ? (
          <EmptyState title="No exports found" description="Try a different search or clear the paid-only filter." />
        ) : (
          <div className="setuExportTable setuDataSurface">
            <DataTable rows={filteredRows} columns={columns} rowKey={(r: Row) => r.id} />
          </div>
        )}

        <MetaFooter />
      </section>

      <ExportReceiptDrawer open={open} onClose={() => setOpen(false)} receipt={selected as any} />
    </AppShell>
  );
}
