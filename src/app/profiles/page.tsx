"use client";

import RequireOnboarding from "../../components/auth/RequireOnboarding";
import AppShell from "../../components/layout/AppShell";
import PeopleDirectory from "../../components/people/PeopleDirectory";
import { useProfile } from "../../lib/useProfile";
import { useRouter } from "next/navigation";
import WorkspaceKpiStrip from "../../components/setu/WorkspaceKpiStrip";

export default function ProfilesPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager";

  return (
    <RequireOnboarding>
      <AppShell
        title="People"
        subtitle={
          isAdmin ? "Directory (org users)" : isManager ? "My team directory" : "My profile"
        }
      >
        <>
        <WorkspaceKpiStrip items={[
          { label: "Active people", value: "34", hint: "Across all delivery teams" },
          { label: "Ready for payroll", value: "27", hint: "Profiles complete" },
          { label: "Needs action", value: "4", hint: "Missing docs or approvals" },
          { label: "Avg rate", value: "$48/hr", hint: "Snapshot estimate" },
        ]} />
        <PeopleDirectory mode="people" />
      </>
      </AppShell>
    </RequireOnboarding>
  );
}
