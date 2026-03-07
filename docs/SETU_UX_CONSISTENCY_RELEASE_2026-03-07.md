# SETU TRACK — UX Consistency + Dashboard / Reports Refresh + Runtime Fixes

Date: 2026-03-07
Baseline: current repository attached in this chat

## What was reviewed

- App shell, sidebar, page-header rhythm, and shared card/table patterns
- Dashboard command-center flow for admin-facing payroll operations
- Payroll report filter bar, KPI framing, and reporting scanability
- Projects and People pages that were crashing at runtime
- Brand asset usage for sidebar logo, favicon, and app icon contexts

## Issues found

1. **Projects and People runtime crashes**
   - The `ProjectsClient` and `PeopleDirectory` components were calling hooks after early-return branches.
   - This created a classic React hook-order mismatch and matches the observed browser-side runtime failure.

2. **Dashboard information hierarchy was too flat**
   - KPI blocks existed, but the admin dashboard still read as separate cards rather than a coherent command center.
   - The operational questions “what is blocking payroll” and “what needs attention now” were not grouped clearly enough.

3. **Payroll report filtering needed stronger framing**
   - Filters, view switching, and current-scope cues were functional but visually under-structured.
   - The reporting page needed more context about the active range/scope and clearer grouping of search vs execution.

4. **Brand assets needed tighter integration**
   - Symbol-only app/favicons and refreshed horizontal marks needed to be aligned with the latest brand pack.

## What was changed

### Runtime / engineering fixes

- Fixed hook-order violations in:
  - `src/app/projects/projects-client.tsx`
  - `src/components/people/PeopleDirectory.tsx`
- Reordered memoized values so all hooks execute before any early return paths.
- Preserved the existing multi-role behavior and page-level access logic while removing the crash condition.

### Dashboard redesign pass

- Reworked the **Admin Dashboard** top section into a more intentional command-center layout:
  - executive comparison cards for current workspace state, pending approvals, current-month payroll, and MoM movement
  - an **Operational focus** panel that groups readiness signals and next actions
  - a **Financial picture** panel that groups budget burn, remaining budget, variance, and payroll state
- Kept the existing watchlist, profile readiness, payroll close control, and contractor payroll visibility sections, but improved the narrative flow above them.

### Reports / payroll UX improvements

- Added stronger current-scope framing to the payroll report filter surface.
- Grouped view mode switching and search into clearer left/right toolbar zones.
- Added visible “current range / scope / active view” pills so the reporting context is easier to understand at a glance.

### Shared UX system additions

Added/updated shared layout classes in `src/app/globals.css` for:

- executive KPI comparison layout
- dashboard split layout
- mini-stat grids
- list-row detail cards
- action clusters
- report toolbar metadata and search sizing
- responsive behavior for the new dashboard/report structures

### Brand updates

Applied latest brand pack assets to:

- sidebar horizontal logo
- app icon
- favicon / touch icon / chrome icons

## Root-cause summary for the page errors

The Projects and People crashes were not data errors or Supabase failures.
They were **client-side React hook order violations** caused by calling `useMemo` after conditional return branches. Once hook execution order was stabilized, those pages could render normally again.

## QA checklist

- [x] Projects page no longer contains the hook-order crash path
- [x] People / Profiles page no longer contains the hook-order crash path
- [x] Admin dashboard hierarchy improved toward a command-center model
- [x] Payroll report filter framing improved
- [x] New brand icons/logos wired into public assets
- [ ] Full production build validation should be run again in the final deployment environment after dependency install completes cleanly

## Recommended next follow-up

1. Continue the same command-center treatment for:
   - Analytics
   - Payroll Runs
   - Exports
2. Unify empty states and section subtitles across all admin/reporting pages.
3. Introduce a shared “section shell” component for dashboard/report cards to reduce CSS drift.
