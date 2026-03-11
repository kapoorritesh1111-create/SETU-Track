# SETU TRACK — Phase 3D-R1 Release

Date: 2026-03-11

## Theme
Role workflow clarity + trust hardening.

This branch keeps scope intentionally narrow and improves the daily flow for contractors and managers without adding new routes or backend dependencies.

## What changed

### Contractor workflow clarity
- Contractor dashboard now emphasizes:
  - what matters now
  - next step
  - approved pay vs waiting approvals
  - rejected vs draft vs submitted work status
- Dashboard actions are now role-aware for contractors.
- My Work now carries a clearer readiness state and next-step summary before the line-entry workspace.

### Manager workflow optimization
- Manager dashboard now focuses on:
  - pending approvals
  - stale approvals
  - direct-report coverage
  - missing rate readiness
- Quick actions now point more directly into approval, people, and project workflows.

### Approvals cleanup
- Empty states now better explain whether the queue is clear, filtered out, or empty for the selected scope.
- Approval CTA text now encourages review-first behavior for higher-risk groups.

### People readiness
- People page now surfaces readiness signals for:
  - missing rates
  - missing manager coverage
  - average contractor rate
- The page reads more like workforce readiness and less like a raw list.

## Files updated
- `src/app/dashboard/page.tsx`
- `src/app/timesheet/page.tsx`
- `src/app/approvals/page.tsx`
- `src/components/dashboard/contractor/ContractorDashboard.tsx`
- `src/components/dashboard/manager/ManagerDashboard.tsx`
- `src/components/people/PeopleDirectory.tsx`
- `README.md`
- `docs/PHASE_3D_R1_RELEASE_2026-03-11.md`
- `docs/PHASE_3D_R1_QA_CHECKLIST_2026-03-11.md`

## Product intent
This release does not add more product surface area.
It makes the current product easier to operate for the roles using it most frequently.

## Engineering notes
- No schema changes
- No new routes
- No new backend endpoints required
- Additive UI and workflow clarification only
