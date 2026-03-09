# Phase 2G Test Checklist

## Dashboard
1. Open `/dashboard`.
2. Change period between current week, last week, current month, last month, and custom.
3. Confirm KPI cards refresh.
4. Confirm `Budget alerts` card appears.
5. Confirm Project Health rows show: Over budget / Near budget / Within budget / No budget.
6. Click `Over-budget projects` and confirm it routes correctly.

## Projects
1. Open `/projects`.
2. Confirm `Project finance controls` card appears with date-range toolbar.
3. Change period and confirm `Actual` values change.
4. Use health filter values:
   - Budgeted only
   - Within budget
   - Near budget
   - Over budget
   - No budget
5. Confirm table rows match the selected health filter.
6. Open a project drawer and confirm budget amount, budget hours, and currency still save.

## Analytics
1. Open `/analytics`.
2. Confirm the date-range toolbar still works.
3. Confirm `Budget variance signals` panel appears.
4. Confirm counts for budgeted, over-budget, and near-budget projects are visible.
5. Confirm project labor mix rows show budget-aware messaging.

## Time Entry
1. Open `/timesheet`.
2. Add at least one line on the first day of the week.
3. Click `Copy first day across week` and confirm days 2-7 receive editable copies.
4. Save a week as template.
5. Select that template and click `Set default`.
6. Click `Apply default` and confirm unlocked rows are applied.
7. Confirm submitted/approved rows are not overwritten.

## Regression
1. `/approvals` opens normally.
2. `/reports/payroll` opens normally.
3. `/profiles` opens normally.
4. Build on Vercel completes.
