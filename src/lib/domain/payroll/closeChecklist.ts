export type ChecklistItem = {
  key: string;
  label: string;
  status: "pass" | "warn";
  count: number;
  detail?: string;
};

export function buildPayrollCloseChecklist(input: {
  blockers: Array<{ entries_count?: number | null }>;
  missingRates: number;
  incompleteProfiles: number;
  pendingEntries: number;
}) {
  const missingApprovals = input.blockers.reduce((sum, row) => sum + Number(row.entries_count ?? 0), 0);
  const items: ChecklistItem[] = [
    {
      key: "missing_approvals",
      label: "Missing approvals",
      status: missingApprovals > 0 ? "warn" : "pass",
      count: missingApprovals,
      detail: missingApprovals > 0 ? "Submitted or draft entries still need manager action before close." : "All entries in range are approved.",
    },
    {
      key: "missing_rates",
      label: "Contractors without hourly rate",
      status: input.missingRates > 0 ? "warn" : "pass",
      count: input.missingRates,
      detail: input.missingRates > 0 ? "Update contractor hourly rate before locking payroll." : "All visible contractors have an hourly rate.",
    },
    {
      key: "incomplete_profiles",
      label: "Incomplete contractor profiles",
      status: input.incompleteProfiles > 0 ? "warn" : "pass",
      count: input.incompleteProfiles,
      detail: input.incompleteProfiles > 0 ? "Complete onboarding/name/rate fields before lock." : "All visible contractor profiles are complete.",
    },
    {
      key: "pending_entries",
      label: "Pending entries",
      status: input.pendingEntries > 0 ? "warn" : "pass",
      count: input.pendingEntries,
      detail: input.pendingEntries > 0 ? "Draft/submitted entries exist in the selected period." : "No draft or submitted entries remain.",
    },
  ];

  return {
    blocked: items.some((item) => item.status === "warn"),
    items,
  };
}
