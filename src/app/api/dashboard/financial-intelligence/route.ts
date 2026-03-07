import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "../../../../lib/api/gates";
import { budgetRiskLevel, getProfileCompletenessReport, variance } from "../../../../lib/domain/financial/overview";

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    start: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export async function GET(req: Request) {
  try {
    const gate = await requireManagerOrAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const { supa, profile } = gate;
    const url = new URL(req.url);
    const start = url.searchParams.get("start") || currentMonthRange().start;
    const end = url.searchParams.get("end") || currentMonthRange().end;

    const [
      { data: projects, error: projectsErr },
      { data: budgets, error: budgetsErr },
      { data: entries, error: entriesErr },
      { data: profiles, error: profilesErr },
      { data: snapshots, error: snapshotsErr },
      { data: exportsHistory, error: exportsErr },
      { data: runs, error: runsErr },
    ] = await Promise.all([
      supa.from("projects").select("id,name,is_active").eq("org_id", profile.org_id).order("name", { ascending: true }),
      supa
        .from("project_budgets")
        .select("id,project_id,budget_amount,billing_rate,currency,cost_tracking_enabled,effective_from,effective_to,note")
        .eq("org_id", profile.org_id)
        .order("effective_from", { ascending: false }),
      supa
        .from("payroll_run_entries")
        .select("project_id,project_name_snapshot,contractor_id,contractor_name_snapshot,hours,amount,payroll_run_id")
        .eq("org_id", profile.org_id),
      supa
        .from("profiles")
        .select("id,full_name,role,hourly_rate,country,payment_details,tax_information,onboarding_completed_at,is_active")
        .eq("org_id", profile.org_id)
        .eq("role", "contractor")
        .eq("is_active", true),
      supa
        .from("payroll_snapshots")
        .select("id,snapshot_key,period_start,period_end,total_hours,total_amount,created_at,payroll_run_id")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(24),
      supa
        .from("export_history")
        .select("id,payroll_run_id,export_type,exported_at,exported_by_name,file_format")
        .eq("org_id", profile.org_id)
        .order("exported_at", { ascending: false })
        .limit(50),
      supa
        .from("payroll_runs")
        .select("id,period_start,period_end,status,total_amount,total_hours,currency,created_at")
        .eq("org_id", profile.org_id)
        .gte("period_start", start)
        .lte("period_end", end)
        .order("created_at", { ascending: false }),
    ]);

    const firstErr = projectsErr || budgetsErr || entriesErr || profilesErr || snapshotsErr || exportsErr || runsErr;
    if (firstErr) return NextResponse.json({ ok: false, error: firstErr.message }, { status: 400 });

    const runsInPeriod = (runs || []) as any[];
    const runIds = new Set(runsInPeriod.map((run) => run.id));
    const projectMap = new Map<string, { id: string; name: string; is_active: boolean }>();
    for (const project of (projects || []) as any[]) projectMap.set(project.id, project);

    const latestBudgetByProject = new Map<string, any>();
    for (const budget of (budgets || []) as any[]) {
      if (!latestBudgetByProject.has(budget.project_id)) latestBudgetByProject.set(budget.project_id, budget);
    }

    const currentEntries = ((entries || []) as any[]).filter((row) => row.payroll_run_id && runIds.has(row.payroll_run_id));
    let totalPayroll = 0;
    let totalHours = 0;
    const byProject = new Map<string, { project_id: string; project_name: string; amount: number; hours: number; budget_amount: number; billing_rate: number; currency: string; remaining_budget: number; risk: string }>();
    const byContractor = new Map<string, { contractor_id: string; contractor_name: string; amount: number; hours: number; project_count: number }>();

    for (const row of currentEntries) {
      const amount = Number(row.amount || 0);
      const hours = Number(row.hours || 0);
      totalPayroll += amount;
      totalHours += hours;

      const budget = latestBudgetByProject.get(row.project_id);
      const budgetAmount = Number(budget?.budget_amount || 0);
      const billingRate = Number(budget?.billing_rate || 0);
      const projectName = row.project_name_snapshot || projectMap.get(row.project_id)?.name || "Untitled project";
      const current = byProject.get(row.project_id) || {
        project_id: row.project_id,
        project_name: projectName,
        amount: 0,
        hours: 0,
        budget_amount: budgetAmount,
        billing_rate: billingRate,
        currency: budget?.currency || "USD",
        remaining_budget: budgetAmount,
        risk: "untracked",
      };
      current.amount += amount;
      current.hours += hours;
      current.remaining_budget = current.budget_amount - current.amount;
      current.risk = budgetRiskLevel(current.remaining_budget, current.budget_amount);
      byProject.set(row.project_id, current);

      const contractor = byContractor.get(row.contractor_id) || {
        contractor_id: row.contractor_id,
        contractor_name: row.contractor_name_snapshot || "Unknown contractor",
        amount: 0,
        hours: 0,
        project_count: 0,
      };
      contractor.amount += amount;
      contractor.hours += hours;
      contractor.project_count += 1;
      byContractor.set(row.contractor_id, contractor);
    }

    const periodSnapshots = ((snapshots || []) as any[]).filter((row) => String(row.snapshot_key || "").startsWith("run:"));
    const previousSnapshot = periodSnapshots.find((row) => !(row.period_start === start && row.period_end === end));
    const currentSnapshot = periodSnapshots.find((row) => row.period_start === start && row.period_end === end);
    const varianceData = variance(totalPayroll || Number(currentSnapshot?.total_amount || 0), Number(previousSnapshot?.total_amount || 0));

    const completeness = ((profiles || []) as any[]).map((person) => {
      const report = getProfileCompletenessReport(person);
      return {
        contractor_id: person.id,
        contractor_name: person.full_name || "Unknown contractor",
        score: report.score,
        missing: report.missing,
        payroll_missing: report.payrollMissing,
      };
    });
    const incomplete = completeness.filter((item) => item.score < 100);

    const budgetSummary = Array.from(byProject.values()).reduce(
      (acc, row) => {
        acc.total_budget += Number(row.budget_amount || 0);
        acc.total_remaining += Number(row.remaining_budget || 0);
        if (row.risk === "high" || row.risk === "over") acc.risk_alerts += 1;
        return acc;
      },
      { total_budget: 0, total_remaining: 0, risk_alerts: 0 }
    );

    return NextResponse.json({
      ok: true,
      range: { start, end },
      analytics: {
        total_payroll: totalPayroll,
        total_hours: totalHours,
        budget_used: Math.max(0, budgetSummary.total_budget - budgetSummary.total_remaining),
        budget_remaining: budgetSummary.total_remaining,
        budget_risk_alerts: budgetSummary.risk_alerts,
        total_projects_tracked: byProject.size,
        incomplete_profiles: incomplete.length,
        export_history_count: (exportsHistory || []).length,
        payroll_variance: varianceData,
      },
      payroll_by_project: Array.from(byProject.values()).sort((a, b) => b.amount - a.amount),
      payroll_by_contractor: Array.from(byContractor.values()).sort((a, b) => b.amount - a.amount),
      project_budgets: Array.from(projectMap.values()).map((project) => {
        const budget = latestBudgetByProject.get(project.id);
        const current = byProject.get(project.id);
        const budgetAmount = Number(budget?.budget_amount || 0);
        const payrollCost = Number(current?.amount || 0);
        const remaining = budgetAmount - payrollCost;
        return {
          project_id: project.id,
          project_name: project.name,
          is_active: project.is_active,
          budget_amount: budgetAmount,
          billing_rate: Number(budget?.billing_rate || 0),
          cost_tracking_enabled: !!budget?.cost_tracking_enabled,
          currency: budget?.currency || "USD",
          payroll_cost: payrollCost,
          remaining_budget: remaining,
          risk: budgetRiskLevel(remaining, budgetAmount),
          note: budget?.note || null,
        };
      }).sort((a, b) => b.payroll_cost - a.payroll_cost || a.project_name.localeCompare(b.project_name)),
      profile_completeness: completeness.sort((a, b) => a.score - b.score || a.contractor_name.localeCompare(b.contractor_name)),
      export_history: exportsHistory || [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
