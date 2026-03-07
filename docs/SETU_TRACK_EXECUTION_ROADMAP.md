# SETU TRACK — CURRENT EXECUTION ROADMAP

This roadmap starts from the **current baseline** in this repository.

## Phase 2A — Approvals + Payroll Intelligence
### Completed in this baseline
- approval queue API and queue-oriented page structure
- bulk approval flow hardened to support selected entry IDs and notes
- approval event history foundation added
- payroll close checklist API added
- admin monthly close panel now has checklist-driven validation
- baseline/domain architecture scaffolding introduced for time, approvals, and payroll

### Immediate QA after deploy
1. Verify approvals page loads queue data for admin and manager roles.
2. Approve a single group and confirm it leaves the queue.
3. Bulk approve selected groups and confirm note capture does not error.
4. Open dashboard monthly close and run Preview close.
5. Confirm checklist items render and blockers table still loads.
6. Run a payroll export and confirm existing export flows still work.

## Phase 2B — Payroll intelligence surfaces
Next recommended work:
- payroll exposure cards: approved vs unpaid
- project budget variance against `project_budgets`
- contractor-level payroll exposure cards
- previous-run comparison cards using `payroll_snapshots`

## Phase 2C — My Work productization
Next recommended work:
- weekly overview cards above the entry grid
- stronger mobile/tablet layout
- faster batch save/submit affordances
- row state clarity for rejected vs submitted vs approved
- better empty-state and assignment guidance

## Phase 3 — Financial operations platform maturity
- automate activity timeline from audit events
- project-level financial health surfaces
- export-to-payment reconciliation center
- configurable org payroll policies and close rules
- manager-level operational command views
