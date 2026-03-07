"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/AppShell";
import RequireOnboarding from "../../components/auth/RequireOnboarding";
import WorkspaceKpiStrip from "../../components/setu/WorkspaceKpiStrip";
import Button from "../../components/ui/Button";
import { apiJson } from "../../lib/api/client";
import { presetToRange } from "../../lib/dateRanges";
import { StatusChip } from "../../components/ui/StatusChip";
import MetaFooter from "../../components/ui/MetaFooter";

type Preset = "current_week" | "last_week" | "current_month" | "last_month";

type AnalyticsPayload = {
  ok: true;
  analytics: {
    total_payroll: number;
    total_hours: number;
    budget_used: number;
    budget_remaining: number;
    budget_risk_alerts: number;
    total_projects_tracked: number;
    incomplete_profiles: number;
    export_history_count: number;
    payroll_variance: { delta: number; pct: number };
  };
  payroll_by_project: Array<{
    project_id: string;
    project_name: string;
    amount: number;
    hours: number;
    budget_amount: number;
    remaining_budget: number;
    risk: string;
    currency: string;
  }>;
  payroll_by_contractor: Array<{
    contractor_id: string;
    contractor_name: string;
    amount: number;
    hours: number;
    project_count: number;
  }>;
  project_budgets: Array<{
    project_id: string;
    project_name: string;
    payroll_cost: number;
    budget_amount: number;
    remaining_budget: number;
    risk: string;
    currency: string;
  }>;
  export_history: Array<{
    id: string;
    export_type: string;
    exported_at: string;
    exported_by_name: string | null;
    file_format: string | null;
  }>;
};

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: "current_week", label: "Current week" },
  { value: "last_week", label: "Last week" },
  { value: "current_month", label: "Current month" },
  { value: "last_month", label: "Last month" },
];

function money(amount: number, currency = "USD") {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function riskState(risk: string) {
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

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>("current_month");
  const range = useMemo(() => presetToRange(preset, "sunday"), [preset]);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const json = await apiJson<AnalyticsPayload>(
        `/api/dashboard/financial-intelligence?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
      );
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const currency = data?.payroll_by_project?.[0]?.currency || data?.project_budgets?.[0]?.currency || "USD";
  const topProjects = data?.payroll_by_project?.slice(0, 6) || [];
  const topContractors = data?.payroll_by_contractor?.slice(0, 6) || [];
  const budgetRows = data?.project_budgets?.slice(0, 6) || [];
  const recentExports = data?.export_history?.slice(0, 6) || [];
  const maxProjectAmount = Math.max(...topProjects.map((item) => item.amount), 1);
  const maxContractorAmount = Math.max(...topContractors.map((item) => item.amount), 1);
  const scopeLabel = `${range.start} → ${range.end}`;
  const variancePct = Number(data?.analytics.payroll_variance?.pct || 0);

  const headerRight = (
    <div className="setuHeaderActions">
      <select className="input analyticsControl" value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
        {PRESETS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <Button variant="secondary" onClick={() => void load()} disabled={loading}>Refresh</Button>
      <a className="btn btnSecondary btnMd setuLinkButton" href="/reports/payroll">Open payroll report</a>
    </div>
  );

  return (
    <RequireOnboarding>
      <AppShell
        title="Analytics"
        subtitle="Operational finance, project cost concentration, and budget risk for the active payroll window."
        right={headerRight}
      >
        <section className="setuReportPage">
          <div className="setuHeroCard analyticsHeroCard">
            <div className="analyticsHeroCopy">
              <div className="setuSectionEyebrow">Live analytics</div>
              <h2>See payroll concentration, budget risk, and contractor cost mix in one decision surface.</h2>
              <p>
                This workspace converts payroll summary data into project-level cost concentration, contractor mix, export activity,
                and budget readiness so admins can act before lock, export, and payment steps drift.
              </p>
            </div>
            <div className="analyticsHeroMeta">
              <div className="analyticsHeroMetaCard">
                <span>Scope</span>
                <strong>{scopeLabel}</strong>
              </div>
              <div className="analyticsHeroMetaCard">
                <span>Projects tracked</span>
                <strong>{loading ? "—" : String(data?.analytics.total_projects_tracked || 0)}</strong>
              </div>
              <div className="analyticsHeroMetaCard">
                <span>Variance</span>
                <strong>{loading ? "—" : `${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}%`}</strong>
              </div>
            </div>
          </div>

          <WorkspaceKpiStrip
            items={[
              { label: "Payroll cost", value: loading ? "—" : money(data?.analytics.total_payroll || 0, currency), hint: scopeLabel },
              { label: "Approved hours", value: loading ? "—" : `${Number(data?.analytics.total_hours || 0).toFixed(2)}h`, hint: "Run-backed payroll hours" },
              { label: "Budget alerts", value: loading ? "—" : String(data?.analytics.budget_risk_alerts || 0), hint: `${data?.analytics.total_projects_tracked || 0} tracked projects` },
              { label: "Export history", value: loading ? "—" : String(data?.analytics.export_history_count || 0), hint: `${data?.analytics.incomplete_profiles || 0} profile blockers` },
            ]}
          />

          {error ? (
            <div className="alert alertWarn">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{error}</pre>
            </div>
          ) : null}

          {!loading && !error && !topProjects.length && !topContractors.length && !budgetRows.length ? (
            <div className="card cardPad analyticsEmptyState">
              <div style={{ fontWeight: 900, fontSize: 18 }}>Analytics will populate after payroll activity is created.</div>
              <div className="muted" style={{ marginTop: 8 }}>
                Approvals, payroll runs, tracked budgets, and project exports feed this workspace. Add budgets and process a payroll run to unlock charts.
              </div>
            </div>
          ) : (
            <section className="analyticsGrid analyticsGridEnhanced">
              <div className="analyticsSplit analyticsSplitEnhanced">
                <article className="analyticsCard analyticsCardTall">
                  <div className="analyticsCardHeader">
                    <div>
                      <div className="analyticsTitle">Project payroll concentration</div>
                      <div className="analyticsHint">Highest-cost projects in the selected analytics window.</div>
                    </div>
                    <span className="pill">{topProjects.length} projects</span>
                  </div>
                  <div className="analyticsChart analyticsChartColumns">
                    {topProjects.length ? topProjects.map((bar) => (
                      <div key={bar.project_id} className="analyticsBarWrap">
                        <div className="analyticsBarValue">{money(bar.amount, bar.currency)}</div>
                        <div className="analyticsBar" style={{ height: `${Math.max(40, (bar.amount / maxProjectAmount) * 190)}px` }} />
                        <div className="analyticsBarLabel">{bar.project_name}</div>
                        <div className="analyticsBarMeta">{bar.hours.toFixed(2)} hrs</div>
                      </div>
                    )) : <div className="muted">No project payroll data in this range.</div>}
                  </div>
                </article>

                <article className="analyticsCard analyticsCardTall">
                  <div className="analyticsCardHeader">
                    <div>
                      <div className="analyticsTitle">Project budget health</div>
                      <div className="analyticsHint">Budget usage and remaining coverage by tracked project.</div>
                    </div>
                    <a className="pill" href="/projects">Projects</a>
                  </div>
                  <div className="analyticsList analyticsListDense">
                    {budgetRows.length ? budgetRows.map((project) => {
                      const pct = project.budget_amount > 0 ? Math.min(100, Math.round((project.payroll_cost / project.budget_amount) * 100)) : 0;
                      return (
                        <div key={project.project_id} className="analyticsBudgetRow">
                          <div className="analyticsBudgetTop">
                            <div>
                              <div className="analyticsListTitle">{project.project_name}</div>
                              <div className="analyticsListMeta">
                                Used {money(project.payroll_cost, project.currency)} • Remaining {money(project.remaining_budget, project.currency)}
                              </div>
                            </div>
                            <StatusChip state={riskState(project.risk)} label={riskLabel(project.risk)} />
                          </div>
                          <div className="analyticsTrendTrack"><div className="analyticsTrendFill" style={{ width: `${Math.max(6, pct)}%` }} /></div>
                        </div>
                      );
                    }) : <div className="muted">Budget tracking will appear here once project budgets exist.</div>}
                  </div>
                </article>
              </div>

              <div className="analyticsSplit analyticsSplitEnhanced">
                <article className="analyticsCard">
                  <div className="analyticsCardHeader">
                    <div>
                      <div className="analyticsTitle">Contractor cost distribution</div>
                      <div className="analyticsHint">Top payroll contributors with project spread and approved hours.</div>
                    </div>
                    <a className="pill" href="/profiles">People</a>
                  </div>
                  <div className="analyticsList analyticsListDense">
                    {topContractors.length ? topContractors.map((contractor) => {
                      const pct = Math.round((contractor.amount / maxContractorAmount) * 100);
                      return (
                        <div key={contractor.contractor_id} className="analyticsBudgetRow">
                          <div className="analyticsBudgetTop">
                            <div>
                              <div className="analyticsListTitle">{contractor.contractor_name}</div>
                              <div className="analyticsListMeta">{contractor.hours.toFixed(2)} approved hours • {contractor.project_count} projects</div>
                            </div>
                            <div className="analyticsRightStack">
                              <strong>{money(contractor.amount, currency)}</strong>
                              <span className="muted">{pct}% of top contributor</span>
                            </div>
                          </div>
                          <div className="analyticsTrendTrack"><div className="analyticsTrendFill" style={{ width: `${Math.max(10, pct)}%` }} /></div>
                        </div>
                      );
                    }) : <div className="muted">No contractor payroll data in this range.</div>}
                  </div>
                </article>

                <article className="analyticsCard">
                  <div className="analyticsCardHeader">
                    <div>
                      <div className="analyticsTitle">Operations and exports</div>
                      <div className="analyticsHint">Workflow readiness across exports, budgets, and payroll completeness.</div>
                    </div>
                    <a className="pill" href="/admin/exports">Export center</a>
                  </div>
                  <div className="analyticsOpsGrid">
                    <div className="analyticsOpsCard">
                      <span>Budget used</span>
                      <strong>{money(data?.analytics.budget_used || 0, currency)}</strong>
                    </div>
                    <div className="analyticsOpsCard">
                      <span>Budget remaining</span>
                      <strong>{money(data?.analytics.budget_remaining || 0, currency)}</strong>
                    </div>
                    <div className="analyticsOpsCard">
                      <span>Variance delta</span>
                      <strong>{money(data?.analytics.payroll_variance?.delta || 0, currency)}</strong>
                    </div>
                    <div className="analyticsOpsCard">
                      <span>Profile blockers</span>
                      <strong>{String(data?.analytics.incomplete_profiles || 0)}</strong>
                    </div>
                  </div>

                  <div className="analyticsList analyticsListDense" style={{ marginTop: 18 }}>
                    <div className="analyticsListItem">
                      <div>
                        <div className="analyticsListTitle">Recent export activity</div>
                        <div className="analyticsListMeta">Latest finance artifacts created for this org.</div>
                      </div>
                    </div>
                    {recentExports.length ? recentExports.map((item) => (
                      <div key={item.id} className="analyticsListItem">
                        <div>
                          <div className="analyticsListTitle">{item.export_type}</div>
                          <div className="analyticsListMeta">{item.file_format?.toUpperCase?.() || "FILE"} • {item.exported_by_name || "System"}</div>
                        </div>
                        <div className="analyticsRightStack">
                          <strong>{new Date(item.exported_at).toLocaleDateString()}</strong>
                          <span className="muted">{new Date(item.exported_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    )) : <div className="muted">No export activity found in this range.</div>}
                  </div>
                </article>
              </div>
            </section>
          )}

          <MetaFooter />
        </section>
      </AppShell>
    </RequireOnboarding>
  );
}
