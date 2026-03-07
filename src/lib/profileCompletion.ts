// src/lib/profileCompletion.ts
import type { Profile } from "./useProfile";
import { getProfileCompletenessReport } from "./domain/financial/overview";

/**
 * Onboarding completeness used for navigation gating.
 * Payroll completeness scoring is handled separately via getProfileCompletenessReport.
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.is_active === false) return false;

  const nameOk = (profile.full_name || "").trim().length >= 2;
  if (!nameOk) return false;

  const role = (profile.role || "").toLowerCase();
  if (role === "contractor") {
    const rate = Number(profile.hourly_rate ?? 0);
    if (!Number.isFinite(rate) || rate <= 0) return false;
  }

  if (!profile.onboarding_completed_at) return false;
  return true;
}

export { getProfileCompletenessReport };
