# SETU TRACK — CURRENT BASELINE
## Phase 2B Financial Intelligence Layer

Date: 2026-03-06

## Platform review summary

### Current maturity
SETU TRACK is now beyond workflow MVP. The platform has a credible App Router structure, role-based routing, domain helpers for approvals and payroll, locked payroll runs, export receipts, and baseline audit logging. It is operating as a stabilization-stage SaaS product rather than a prototype.

### Architectural strengths
- Clear module split between app routes, UI components, and lightweight domain helpers.
- Payroll locking and snapshot-backed reporting already exist, which creates a strong financial control point.
- API gates centralize role checks for admin / manager flows.
- Multi-tenant org scoping is present in both application logic and RLS strategy.
- Export events and audit log patterns already support traceability.

### Technical debt and risks
- Financial logic is still distributed between pages and route handlers instead of being consistently centralized in domain services.
- Project budget tables existed but were not yet surfaced as a first-class product feature.
- Contractor payroll readiness relied on binary onboarding checks rather than graded completeness scoring.
- Export audit data existed, but not as a dedicated payroll export ledger.
- Some dashboard cards were still operational rather than financial, limiting SaaS maturity.
- Build verification could not be completed inside this environment because package installation was unavailable.

## Implemented in Phase 2B

### 1) Financial intelligence API
Added a new dashboard intelligence endpoint:
- `GET /api/dashboard/financial-intelligence`

This endpoint aggregates:
- total payroll for the selected period
- payroll by project
- payroll by contractor
- budget usage and remaining budget
- budget risk alerts
- contractor profile completeness
- payroll variance vs prior snapshot-backed run
- export ledger counts

### 2) Richer project budgets
Enhanced `project_budgets` to support:
- `billing_rate`
- `cost_tracking_enabled`

This enables budget vs payroll-cost visibility rather than simple budget storage.

### 3) Contractor payroll completeness
Enhanced `profiles` with:
- `country`
- `payment_details` (jsonb)
- `tax_information` (jsonb)

Added a graded completeness model in:
- `src/lib/domain/financial/overview.ts`
- `src/lib/profileCompletion.ts`

This provides:
- percentage score
- missing field list
- payroll-critical missing field list

### 4) Export history ledger
Added table:
- `export_history`

Purpose:
- per-payroll export traceability
- normalized audit ledger for payroll exports
- linkage to `payroll_runs`, `export_events`, and `project_exports`

Export logging now writes to both:
- `export_events`
- `export_history`

### 5) Dashboard upgrade
Admin and Manager dashboards now include:
- payroll totals
- budget used / remaining
- budget risk exposure
- incomplete contractor profile visibility
- export ledger counts
- budget watchlist cards
- contractor readiness cards

### 6) Payroll run detail upgrade
Payroll run detail now behaves more like a financial register by exposing:
- project allocation summary
- export history ledger
- run-level totals and status context

## Files added / updated

### New
- `src/lib/domain/financial/overview.ts`
- `src/app/api/dashboard/financial-intelligence/route.ts`
- `src/app/api/projects/budgets/route.ts`
- `supabase/migrations/0026_phase_2b_financial_intelligence.sql`
- `docs/SETU_PHASE_2B_IMPLEMENTATION_SUMMARY.md`

### Updated
- `src/lib/profileCompletion.ts`
- `src/lib/useProfile.ts`
- `src/lib/exports/logExportEvent.ts`
- `src/components/dashboard/admin/AdminDashboard.tsx`
- `src/components/dashboard/manager/ManagerDashboard.tsx`
- `src/app/api/payroll/runs/[id]/route.ts`
- `src/app/reports/payroll-runs/[id]/page.tsx`

## Recommended next steps after Phase 2B
- Move payroll summary aggregation into a dedicated domain service layer used by all payroll routes.
- Surface project budget editing directly in the Projects UI.
- Add charts for payroll variance, margin trend, and budget burn.
- Introduce financial forecasting using billing rate vs payroll cost.
- Add automated payroll anomaly alerts for rate gaps, budget overruns, and missing tax/payment details.
