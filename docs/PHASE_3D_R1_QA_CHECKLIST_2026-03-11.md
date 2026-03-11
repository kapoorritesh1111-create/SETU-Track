# SETU TRACK — Phase 3D-R1 QA Checklist

Date: 2026-03-11

## Build gate
- `npm install`
- `npm run build`
- verify no TypeScript errors
- verify no route import failures

## Contractor checks
- Dashboard shows role-appropriate actions
- Contractor dashboard shows approved pay, waiting approvals, and action-needed counts
- My Work shows a clear readiness state and next step
- Rejected lines still display rejection reasons correctly
- Submit week flow still works

## Manager checks
- Dashboard shows pending approvals, stale approvals, direct reports, and missing rate counts
- Approvals opens correctly from dashboard quick actions
- People opens correctly from dashboard quick actions
- Manager does not see admin-only actions

## Approvals checks
- Empty states differ correctly for:
  - no submitted entries
  - no matching filter results
  - selected week clear
  - all pending clear
- Riskier approval groups show “Approve after review”
- Ready groups still show normal “Approve”

## People checks
- Readiness strip shows missing rates and missing managers correctly
- Admin can still edit roles, managers, rates, and active state
- Manager can still edit permitted direct-report fields only
- Contractor remains restricted to self-visibility
