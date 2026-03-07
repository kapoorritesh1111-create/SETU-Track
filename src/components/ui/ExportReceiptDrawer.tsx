"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Loader2, X } from "lucide-react";
import Button from "./Button";
import { Card } from "./Card";
import { apiJson } from "../../lib/api/client";

export type ExportReceipt = {
  id: string;
  org_id?: string;
  created_at: string;
  created_by?: string | null;
  actor_name?: string | null;
  type?: string | null;
  label?: string | null;
  project_id?: string | null;
  payroll_run_id?: string | null;
  project_export_id?: string | null;
  payload_hash?: string | null;
  diff_status?: "same" | "changed" | "unknown" | null;
  meta?: any;
};

type PaidState = {
  id: string;
  is_paid: boolean;
  paid_by: string | null;
  paid_at: string | null;
  paid_note: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  receipt: ExportReceipt | null;
};

function diffText(status?: string | null) {
  if (status === "same") return "Matches previous payload";
  if (status === "changed") return "Payload changed from previous export";
  return "Baseline or unmatched payload";
}

export default function ExportReceiptDrawer({ open, onClose, receipt }: Props) {
  const r = receipt;
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState<PaidState | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const isProjectLinked = !!(r?.project_id && r?.project_export_id);
  const canTogglePaid = useMemo(() => isProjectLinked, [isProjectLinked]);

  useEffect(() => {
    setCopyOk(false);
    setBusy(false);
    const initialPaid = r?.meta && typeof r.meta === "object"
      ? {
          id: r.project_export_id || r.id,
          is_paid: !!r.meta.is_paid || !!r.meta.paid_at,
          paid_by: r.meta.paid_by || null,
          paid_at: r.meta.paid_at || null,
          paid_note: r.meta.paid_note || "",
        }
      : null;
    setPaid(initialPaid);
  }, [r?.id, r?.project_export_id, open]);

  async function copyReceiptId() {
    if (!r?.id) return;
    try {
      await navigator.clipboard.writeText(r.id);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 900);
    } catch {
      // ignore clipboard failures
    }
  }

  async function togglePaid(nextPaid: boolean) {
    if (!r?.project_id || !r?.project_export_id) return;
    const note = nextPaid ? window.prompt("Paid note (optional)", paid?.paid_note || "") ?? "" : "";
    setBusy(true);
    try {
      const json = await apiJson<{ ok: boolean; export: PaidState }>(`/api/projects/${encodeURIComponent(r.project_id)}/exports/${encodeURIComponent(r.project_export_id)}/paid`, {
        method: "POST",
        body: { is_paid: nextPaid, paid_note: note },
      });
      if (json?.ok && json.export) setPaid(json.export);
    } catch (e: any) {
      alert(e?.message || "Failed to update paid status.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="drawerOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawerPanel">
        <div className="drawerHeader">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Export Receipt</div>
            <div className="muted" style={{ marginTop: 2 }}>Official record of an export action and its linked project receipt state.</div>
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="drawerBody">
          {!r ? (
            <div className="card cardPad"><div className="muted">No receipt selected.</div></div>
          ) : (
            <>
              <div className="setuReceiptHero">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 22 }}>{r.label || r.type || "Export"}</div>
                    <div className="muted" style={{ marginTop: 6 }}>{new Date(r.created_at).toLocaleString()} • {r.meta?.receipt_status_label || "Receipt"}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Button variant="secondary" onClick={copyReceiptId}>{copyOk ? "Copied" : "Copy ID"}</Button>
                    <a className="pill setuLinkButton" href="/admin/exports">Exports <ExternalLink size={14} style={{ marginLeft: 6 }} /></a>
                  </div>
                </div>
                <div className="setuMetaGrid3" style={{ marginTop: 16 }}>
                  <div className="setuMetaCard">
                    <div className="setuMetaCardLabel">Project</div>
                    <div className="setuMetaCardValue">{r.meta?.project_name || r.project_id || "Org-level export"}</div>
                  </div>
                  <div className="setuMetaCard">
                    <div className="setuMetaCardLabel">Period</div>
                    <div className="setuMetaCardValue">{r.meta?.period_label || "No period linked"}</div>
                  </div>
                  <div className="setuMetaCard">
                    <div className="setuMetaCardLabel">Diff state</div>
                    <div className="setuMetaCardValue">{r.meta?.diff_status_label || diffText(r.diff_status)}</div>
                  </div>
                </div>
              </div>

              <Card>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Receipt details</div>
                <div className="grid2">
                  <div>
                    <div className="muted">Receipt ID</div>
                    <div className="mono">{r.id}</div>
                  </div>
                  <div>
                    <div className="muted">Created by</div>
                    <div>{r.actor_name || r.created_by || "—"}</div>
                  </div>
                  <div>
                    <div className="muted">Payroll run</div>
                    <div>{r.payroll_run_id || "—"}</div>
                  </div>
                  <div>
                    <div className="muted">Payload hash</div>
                    <div className="mono">{r.payload_hash || "—"}</div>
                  </div>
                  <div>
                    <div className="muted">Total amount</div>
                    <div>{r.meta?.total_amount ? `${r.meta?.currency || "USD"} ${Number(r.meta.total_amount).toFixed(2)}` : "—"}</div>
                  </div>
                  <div>
                    <div className="muted">Total hours</div>
                    <div>{r.meta?.total_hours != null ? Number(r.meta.total_hours).toFixed(2) : "—"}</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Project receipt paid status</div>
                    <div className="muted" style={{ marginTop: 4 }}>This controls the linked client receipt state for the project export.</div>
                  </div>
                  {canTogglePaid ? (
                    <div className="row" style={{ gap: 8 }}>
                      <Button variant="secondary" disabled={busy} onClick={() => togglePaid(false)}>{busy ? <Loader2 size={14} className="spin" /> : null}Mark unpaid</Button>
                      <Button disabled={busy} onClick={() => togglePaid(true)}>{busy ? <Loader2 size={14} className="spin" /> : null}Mark paid</Button>
                    </div>
                  ) : (
                    <div className="muted">Not linked to a project export record.</div>
                  )}
                </div>

                <div style={{ marginTop: 12 }}>
                  {!paid ? (
                    <div className="muted">Paid information will appear here after the export is linked.</div>
                  ) : (
                    <div className="grid2">
                      <div>
                        <div className="muted">Status</div>
                        <div className="row" style={{ gap: 8, alignItems: "center" }}>
                          <CheckCircle2 size={16} />
                          {paid.is_paid ? "Paid" : "Unpaid"}
                        </div>
                      </div>
                      <div>
                        <div className="muted">Paid at</div>
                        <div>{paid.paid_at ? new Date(paid.paid_at).toLocaleString() : "—"}</div>
                      </div>
                      <div>
                        <div className="muted">Paid by</div>
                        <div>{paid.paid_by || "—"}</div>
                      </div>
                      <div>
                        <div className="muted">Note</div>
                        <div>{paid.paid_note || "—"}</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
