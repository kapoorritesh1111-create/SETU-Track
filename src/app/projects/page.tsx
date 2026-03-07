"use client";

import { Suspense } from "react";
import RequireOnboarding from "../../components/auth/RequireOnboarding";
import AppShell from "../../components/layout/AppShell";
import ProjectsClient from "./projects-client";
import WorkspaceKpiStrip from "../../components/setu/WorkspaceKpiStrip";

function ProjectsLoading() {
  return (
    <AppShell title="Projects" subtitle="Create projects and manage access">
      <div className="card cardPad prShell">
        <div className="muted">Loading…</div>
      </div>
    </AppShell>
  );
}

export default function ProjectsPage() {
  return (
    <RequireOnboarding>
      <Suspense fallback={<ProjectsLoading />}>
        <>
          <WorkspaceKpiStrip items={[
            { label: "Active projects", value: "12", hint: "6 billable this cycle" },
            { label: "Client revenue", value: "$84.5k", hint: "Projected current month" },
            { label: "Gross margin", value: "31%", hint: "Portfolio weighted" },
            { label: "At risk", value: "2", hint: "Budget or staffing pressure" },
          ]} />
          <ProjectsClient />
        </>
      </Suspense>
    </RequireOnboarding>
  );
}
