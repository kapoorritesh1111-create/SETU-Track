# Phase 2J.1 — Activity + Payroll Presentation Cleanup

## Updated
- Converted admin activity audit rows from raw action / UUID / metadata output into human-readable event rows.
- Added actor profile enrichment so activity rows show names/emails instead of only actor IDs.
- Replaced raw snake_case action display with readable verbs and titles.
- Replaced the payroll report narrative paragraph card with a compact 3-step usage guide.

## Files
- `src/lib/data/activityData.ts`
- `src/lib/activityPresentation.ts`
- `src/components/activity/ActivityEventRow.tsx`
- `src/components/payroll/PayrollReportGuide.tsx`
- `src/app/admin/activity/page.tsx`
- `src/app/reports/payroll/page.tsx`
- `src/app/globals.css`
