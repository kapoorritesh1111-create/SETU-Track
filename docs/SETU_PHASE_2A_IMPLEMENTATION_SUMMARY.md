# SETU TRACK — Phase 2A Implementation Summary

## What changed
- Locked this repository as the **current baseline** in README and baseline docs.
- Added domain-service scaffolding for time, approvals, and payroll.
- Added approvals queue API with anomaly detection and note history support.
- Hardened batch approval route to support the page's selected-entry workflow.
- Added additive migration for `project_budgets`, `payroll_snapshots`, and `approval_events`.
- Added payroll close checklist API for admin monthly close validation.
- Updated admin dashboard monthly close preview to use checklist-driven validation.
- Updated approvals UI to show queue summary metrics, anomaly flags, and recent note history.

## Why it changed
This baseline needed to move away from page-heavy operational logic and toward reusable domain services plus API-backed workflows. Phase 2A is about making approvals and payroll feel like an operational system rather than a collection of isolated screens.

## Follow-up work recommended
1. Finish moving remaining timesheet submission logic into domain services and API routes.
2. Add persisted payroll intelligence cards backed by `payroll_snapshots`.
3. Add project budget variance UI using `project_budgets`.
4. Add explicit approval-note entry for rejection and comment-only events.
5. Run a full dependency install and `npm run build` in the deployment environment after applying migration `0025_phase_2a_foundation.sql`.
