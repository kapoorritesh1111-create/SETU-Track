"use client";

import AppShell from "../../components/layout/AppShell";
import RequireOnboarding from "../../components/auth/RequireOnboarding";
import WorkspaceKpiStrip from "../../components/setu/WorkspaceKpiStrip";

const bars = [
  { label: "Jan", value: 48 },
  { label: "Feb", value: 64 },
  { label: "Mar", value: 58 },
  { label: "Apr", value: 76 },
  { label: "May", value: 84 },
  { label: "Jun", value: 72 },
];

const projects = [
  { name: "Website Redesign", meta: "Revenue $54k • Margin 33%", state: "Healthy", value: "$17.8k" },
  { name: "Mobile App Development", meta: "Revenue $92k • Margin 31%", state: "Watching", value: "$28.4k" },
  { name: "Digital Marketing", meta: "Revenue $38k • Margin 12%", state: "At risk", value: "$4.7k" },
  { name: "Client Onboarding", meta: "Revenue $21k • Margin 27%", state: "Healthy", value: "$5.6k" },
];

const contractors = [
  { name: "Daniel Rowe", meta: "Approved 168h • Ready for payroll", rate: "$8.1k" },
  { name: "Priya Mehra", meta: "Approved 154h • Export linked", rate: "$7.6k" },
  { name: "Aman Fisher", meta: "Approved 141h • Needs review", rate: "$6.9k" },
];

export default function AnalyticsPage() {
  return (
    <RequireOnboarding>
      <AppShell
        title="Analytics"
        subtitle="Financial intelligence, delivery health, and contractor cost visibility across the operating model."
      >
        <WorkspaceKpiStrip
          items={[
            { label: "Payroll cost", value: "$124k", hint: "Rolling 30-day view" },
            { label: "Client revenue", value: "$182k", hint: "Projected current month" },
            { label: "Gross margin", value: "31.8%", hint: "Weighted portfolio margin" },
            { label: "Budget alerts", value: "3", hint: "Projects nearing threshold" },
          ]}
        />

        <section className="analyticsGrid">
          <div className="analyticsSplit">
            <article className="analyticsCard">
              <div className="analyticsTitle">Payroll and revenue trend</div>
              <div className="analyticsHint">Command-center view of cost growth versus delivery throughput.</div>
              <div className="analyticsChart">
                {bars.map((bar) => (
                  <div key={bar.label} className="analyticsBarWrap">
                    <div className="analyticsBar" style={{ height: `${bar.value * 2}px` }} />
                    <div className="analyticsBarLabel">{bar.label}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="analyticsCard">
              <div className="analyticsTitle">Top project economics</div>
              <div className="analyticsHint">Projects ranked by contribution and delivery health.</div>
              <div className="analyticsList">
                {projects.map((project) => (
                  <div key={project.name} className="analyticsListItem">
                    <div>
                      <div className="analyticsListTitle">{project.name}</div>
                      <div className="analyticsListMeta">{project.meta}</div>
                    </div>
                    <div className="analyticsRight">
                      <div className="analyticsListTitle">{project.value}</div>
                      <div className="analyticsListMeta">{project.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="analyticsSplit">
            <article className="analyticsCard">
              <div className="analyticsTitle">Contractor cost distribution</div>
              <div className="analyticsHint">High-value contributors and payroll readiness status.</div>
              <div className="analyticsList">
                {contractors.map((contractor) => (
                  <div key={contractor.name} className="analyticsListItem">
                    <div>
                      <div className="analyticsListTitle">{contractor.name}</div>
                      <div className="analyticsListMeta">{contractor.meta}</div>
                    </div>
                    <div className="analyticsRight">
                      <div className="analyticsListTitle">{contractor.rate}</div>
                      <div className="analyticsListMeta">Current period</div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="analyticsCard">
              <div className="analyticsTitle">What this page is for</div>
              <div className="analyticsHint">
                This new page establishes the SETU TRACK analytics surface so the platform can evolve beyond time tracking into a contractor financial operations workspace.
              </div>
              <div className="analyticsList">
                <div className="analyticsListItem">
                  <div>
                    <div className="analyticsListTitle">Finance hierarchy</div>
                    <div className="analyticsListMeta">Payroll cost, client revenue, margin, and budget signals now sit at the top of the experience.</div>
                  </div>
                </div>
                <div className="analyticsListItem">
                  <div>
                    <div className="analyticsListTitle">Shared UI system</div>
                    <div className="analyticsListMeta">Uses the same shell, KPI strip, and card anatomy introduced across Dashboard, Projects, and People.</div>
                  </div>
                </div>
                <div className="analyticsListItem">
                  <div>
                    <div className="analyticsListTitle">Next technical step</div>
                    <div className="analyticsListMeta">Replace the demo metrics with a consolidated analytics service once the dashboard aggregation layer is finalized.</div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </AppShell>
    </RequireOnboarding>
  );
}
