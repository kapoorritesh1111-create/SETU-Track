# SETU TRACK — Phase 2H + 2I

This pass moves the product from descriptive reporting into forecasting, exception operations, and platform-maturity navigation.

## Implemented

### Dashboard
- Added **Forecast payroll** KPI and pending-forecast visibility.
- Added **Operations signals** KPI for stale approvals, overtime risk, missing submissions, and rate integrity gaps.
- Added secondary summary strip for approved payroll, pending payroll, projects at risk, and operational integrity.
- Expanded operational focus actions with links into stale approvals, over-budget projects, and the new activity timeline.

### Approvals
- Added exception summaries for:
  - stale approvals
  - overtime signals
  - locked ranges
  - missing timesheet coverage signals
- Added route-driven quick filters via `scope`.

### Projects
- Extended project drawer finance card with:
  - actual cost and hours
  - forecast cost based on pending entries
  - budget burn progress bar
- Keeps period-aware actuals aligned to the shared finance toolbar.

### Analytics
- Added projected payroll KPI.
- Added operations alerts KPI.
- Reinforced budget-aware analytics as a forecasting workspace.

### Time entry
- Added favorite-project workflow:
  - save project as favorite from an entry row
  - quick-add a favorite project to the current week
- Keeps existing templates and copy workflows intact.

### Platform maturity / navigation
- Grouped sidebar navigation into:
  - Operations
  - Organization
  - Finance
  - Admin
- Added new admin page:
  - `/admin/activity`
- Activity page surfaces:
  - audit log timeline
  - export events
  - payroll run timeline

## Notes
- This phase intentionally avoids background-job infrastructure changes and external integration setup.
- The implementation stays inside the current deployed architecture so the working baseline remains stable.
