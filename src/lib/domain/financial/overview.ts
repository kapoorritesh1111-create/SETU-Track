export type ProfileCompletenessInput = {
  full_name?: string | null;
  hourly_rate?: number | null;
  onboarding_completed_at?: string | null;
  country?: string | null;
  payment_details?: Record<string, unknown> | null;
  tax_information?: Record<string, unknown> | null;
  role?: string | null;
};

export type ProfileCompletenessReport = {
  score: number;
  complete: boolean;
  missing: string[];
  payrollMissing: string[];
};

export function getProfileCompletenessReport(profile: ProfileCompletenessInput | null): ProfileCompletenessReport {
  if (!profile) {
    return { score: 0, complete: false, missing: ["profile"], payrollMissing: ["profile"] };
  }

  const checks = [
    { key: "full_name", ok: String(profile.full_name || "").trim().length >= 2, payroll: false },
    { key: "hourly_rate", ok: Number(profile.hourly_rate ?? 0) > 0 || String(profile.role || "") !== "contractor", payroll: true },
    { key: "country", ok: String(profile.country || "").trim().length >= 2, payroll: true },
    {
      key: "payment_details",
      ok: !!profile.payment_details && Object.keys(profile.payment_details || {}).some((key) => String((profile.payment_details as any)?.[key] || "").trim().length > 0),
      payroll: true,
    },
    {
      key: "tax_information",
      ok: !!profile.tax_information && Object.keys(profile.tax_information || {}).some((key) => String((profile.tax_information as any)?.[key] || "").trim().length > 0),
      payroll: true,
    },
    { key: "onboarding", ok: !!profile.onboarding_completed_at, payroll: false },
  ];

  const passed = checks.filter((item) => item.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const missing = checks.filter((item) => !item.ok).map((item) => item.key);
  const payrollMissing = checks.filter((item) => !item.ok && item.payroll).map((item) => item.key);

  return {
    score,
    complete: missing.length === 0,
    missing,
    payrollMissing,
  };
}

export function variance(current: number, previous: number) {
  const delta = current - previous;
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : (delta / previous) * 100;
  return { delta, pct };
}

export function budgetRiskLevel(remaining: number, budget: number) {
  if (budget <= 0) return "untracked" as const;
  const usedPct = ((budget - remaining) / budget) * 100;
  if (remaining < 0 || usedPct >= 100) return "over" as const;
  if (usedPct >= 85) return "high" as const;
  if (usedPct >= 65) return "watch" as const;
  return "healthy" as const;
}
