# SETU TRACK — Phase 2E Project Finance + Time Entry Templates

## What changed

### Time entry workspace
- Added **Copy previous day** to each day card.
- Added **Copy last week** to the weekly command bar.
- Added **week templates** saved in browser storage:
  - Save current week as template
  - Apply selected template
  - Delete selected template

These actions preserve submitted and approved lines for the target day/week and only replace editable rows.

### Project finance groundwork
- Added migration `0025_project_budget_groundwork.sql`.
- This introduces optional project budget fields:
  - `budget_hours`
  - `budget_amount`
  - `budget_currency`

## Why this matters
- Time entry is now much faster for repeat work weeks.
- The product now has the schema groundwork to evolve Projects into a real **budget vs actual** management layer.

## Recommended next implementation pass
1. Apply migration `0025_project_budget_groundwork.sql` in Supabase.
2. Add project drawer editing for budget amount / budget hours.
3. Add current-month actual labor rollups per project.
4. Add variance pills and over-budget alerts in Projects and Payroll Report.
5. Add project budget trend charts in Analytics.

## QA checklist
- Open `/timesheet`
- Save draft rows for at least two days
- Use **Copy previous day** on a later day
- Use **Save as template**
- Move to a different week and apply the template
- Use **Copy last week** and confirm editable rows are cloned
- Confirm submitted/approved rows remain locked
