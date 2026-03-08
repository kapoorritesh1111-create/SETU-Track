# RELEASE NOTES — 2026-03-08

## Summary of issues fixed
- login logo missing on desktop and mobile
- login hero pushed the form too far down on mobile
- app shell branding was inconsistent across sidebar, drawer, and compact header
- dashboard lacked a clear top-level period control and action hierarchy
- timesheet submitted state could become unreadable
- quick-fill/time-copy productivity actions were incomplete
- several screens regressed on mobile breakpoints, especially timesheet and payroll report

## Before / after summary
- before: brand assets were inconsistent, logo paths drifted, mobile shell felt compressed, and timesheet actions required more manual work
- after: canonical brand assets are wired, mobile shell/header/drawer are cleaner, dashboard has a true top control bar, and timesheet supports quick-fill + template workflows

## Known limitations
- this packaging pass did not complete a dependency-backed `next build` inside the container
- dashboard data richness still depends on the quality of source records in Supabase
- weekly templates are local-browser templates, not org-shared templates yet

## Recommended next steps
- add org-shared weekly templates backed by Supabase
- extend period control consistency into payroll report and analytics
- create a dedicated mobile filter drawer for payroll report and analytics
- run a full cross-browser QA pass for light and dark themes
