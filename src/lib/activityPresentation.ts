export function humanizeActivityVerb(action?: string | null) {
  const value = String(action || "").toLowerCase();
  const map: Record<string, string> = {
    timesheet_approved: "approved a timesheet",
    timesheet_submitted: "submitted a timesheet",
    payroll_run_created: "created a payroll run",
    payroll_run_paid: "marked a payroll run as paid",
    payroll_run_voided: "voided a payroll run",
    export_generated: "generated an export",
  };
  return map[value] || (value ? value.replaceAll("_", " ") : "recorded an event");
}

export function activityTone(action?: string | null): "default" | "success" | "warning" {
  const value = String(action || "").toLowerCase();
  if (value.includes("void") || value.includes("reject") || value.includes("delete")) return "warning";
  if (value.includes("approve") || value.includes("paid") || value.includes("export") || value.includes("lock") || value.includes("submit")) return "success";
  return "default";
}

export function formatActivityDetail(row: {
  action?: string | null;
  metadata?: Record<string, unknown> | null;
  entity_type?: string | null;
}) {
  const meta = row.metadata || {};
  const action = String(row.action || "").toLowerCase();

  if (action === "timesheet_approved" || action === "timesheet_submitted") {
    const weekStart = typeof meta.week_start === "string" ? meta.week_start : null;
    const weekEnd = typeof meta.week_end === "string" ? meta.week_end : null;
    const count = typeof meta.entry_count === "number" ? meta.entry_count : null;
    return [weekStart && weekEnd ? `Week ${weekStart} → ${weekEnd}` : null, count != null ? `${count} entries` : null]
      .filter(Boolean)
      .join(" • ");
  }

  if (action.includes("payroll")) {
    return row.entity_type ? `Lifecycle event for ${row.entity_type}` : "Payroll lifecycle event";
  }

  return row.entity_type ? `Updated ${row.entity_type}` : null;
}

export function activityTitle(action?: string | null) {
  const value = String(action || "").toLowerCase();
  const map: Record<string, string> = {
    timesheet_approved: "Timesheet approved",
    timesheet_submitted: "Timesheet submitted",
    payroll_run_created: "Payroll run created",
    payroll_run_paid: "Payroll marked paid",
    payroll_run_voided: "Payroll run voided",
    export_generated: "Export generated",
  };
  return map[value] || (value ? value.replaceAll("_", " ") : "Activity event");
}
