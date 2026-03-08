# CHANGELOG

## 2026-03-08 — Brand system + dashboard + timesheet + responsive pass

### Included
- canonical brand configuration added in `src/config/brand.ts`
- official SETU TRACK logo assets wired through `public/brand/logo.svg`, `public/brand/logo-mark.svg`, and PNG fallbacks
- login page repaired so the logo, tagline, and footer attribution render correctly on desktop and mobile
- app shell branding refreshed for sidebar, drawer, and mobile header
- dashboard control bar added with a global period selector and action queue
- dashboard gained recent activity and payroll readiness surfaces
- weekly timesheet improved with quick-fill actions, weekly templates, inline validation, sticky summary, and clearer submitted-state feedback
- responsive cleanup across login, dashboard, my work, payroll report, sidebar drawer, and billing surfaces
- dark-mode token compatibility improved for the new brand and control surfaces

### Notes
- local packaging completed
- dependency-backed `next build` was not completed in this container because install/build tooling was unavailable at packaging time
