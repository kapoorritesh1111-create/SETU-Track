# Phase 2G — Dashboard Alerts + Shared Project Finance Controls

This pass extends the Project Finance layer introduced in Phase 2F and makes budget-vs-actual visible across the command center surfaces.

## Implemented
- Dashboard project budget health signals
- Dashboard budget alert KPI and over-budget focus item
- Dashboard project health cards now show budget state
- Projects page shared finance period toolbar
- Projects page budget health filter
- Projects page finance KPI strip aligned to selected range
- Analytics budget variance signals panel
- Timesheet productivity upgrades:
  - copy first day across week
  - set default weekly template
  - apply default weekly template

## Product intent
SETU TRACK now behaves more like a labor-finance workspace:
- Dashboard = management cockpit
- Projects = project finance workspace
- Analytics = variance insight workspace
- Timesheet = faster repeat scheduling workspace

## Notes
- Budget health states use a combined interpretation of budget amount and budget hours.
- Near budget = 80% to 99% of the relevant threshold.
- Over budget = 100%+ of the relevant threshold.
