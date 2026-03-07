# CHANGELOG

## 2026-03-07 — Product repair + UX consistency release

### Shell / navigation
- Replaced the sidebar brand lockup with the approved horizontal SETU TRACK wordmark.
- Removed duplicate product naming patterns in the shell by avoiding `SETU TRACK` as the org badge fallback.
- Tightened shell spacing, content width, and responsive behavior for desktop and mobile.

### Dashboard
- Reworked the admin dashboard into a lighter command center with controls at the top.
- Reduced narrative copy and moved payroll close controls into the hero area.
- Grouped operational actions and checklist content into a cleaner split layout.
- Preserved payroll readiness, budget, and profile completeness signals while reducing visual weight.

### Payroll report
- Shortened the reporting narrative and scope copy.
- Cleaned header actions and improved filter copy.
- Renamed segmented report views to simpler labels.
- Kept payment/export logic intact while making the report easier to scan.

### Analytics
- Continued using the functional analytics workspace introduced in the prior pass.
- Preserved project concentration, contractor distribution, budget health, and export activity sections.
- Kept a meaningful empty state for orgs without enough payroll data.

### Exports / payroll runs / billing
- Preserved paid-state reconciliation improvements in Exports.
- Kept payroll runs using a stronger paid-state indicator with run-level action clarity.
- Expanded Billing as a Stripe-ready workspace rather than a placeholder page.

### Design system / theming
- Extended the theme layer with additional dark-mode and surface overrides.
- Increased consistency across hero cards, filter bars, tables, and admin workspaces.
- Improved sidebar, segmented control, and responsive utility styling.

### Assets
- Added the approved UI-ready brand assets:
  - `public/brand/setu-logo-horizontal-light.png`
  - `public/brand/setu-logo-horizontal-dark.png`
  - `public/brand/setu-symbol-512.png`
