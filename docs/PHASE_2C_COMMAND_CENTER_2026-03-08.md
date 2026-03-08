# SETU TRACK — Phase 2C Command Center + Connected Screens

Date: 2026-03-08

## What was implemented

This pass packages the next connected product step around four linked workspaces:

- Dashboard command center
- Approvals queue
- Analytics workspace
- Payroll report

## Main updates

### 1. Command Center Dashboard
- Rebuilt the admin dashboard into a true command-center surface.
- Added shared period controls for:
  - current week
  - last week
  - current month
  - last month
  - custom range
- Added command-center sections for:
  - executive KPIs
  - payroll readiness
  - operational focus
  - financial snapshot
  - project health
  - recent activity
  - recent payroll runs

### 2. Shared range tooling
- Added `src/components/ui/DateRangeToolbar.tsx`
- Extended `src/lib/dateRanges.ts` with:
  - `previousRangeFor()`
  - `presetLabel()`
- Analytics and dashboard now use the same period-control pattern.

### 3. Analytics alignment
- Rebuilt `/analytics` to align with the dashboard date-range model.
- Added connected-screen actions back to:
  - dashboard
  - approvals
  - payroll report
- Improved project and people analysis sections.

### 4. Approvals queue alignment
- Added queue summary metrics to the approvals screen.
- Added query-param driven support for opening the queue in `scope=all` mode from the dashboard.

## Files updated
- `src/components/dashboard/admin/AdminDashboard.tsx`
- `src/components/ui/DateRangeToolbar.tsx`
- `src/lib/dateRanges.ts`
- `src/app/analytics/page.tsx`
- `src/app/approvals/page.tsx`
- `src/app/globals.css`

## Notes
- The current container does not have a usable local Next.js toolchain installed, so a full local `next build` could not be completed here.
- Source-level packaging was completed and the new command-center structure was applied conservatively on top of the current working baseline.
