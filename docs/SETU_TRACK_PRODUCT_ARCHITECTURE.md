# SETU TRACK — CURRENT BASELINE

_Last updated: 2026-03-06_

This repository is the **official product baseline** for SETU TRACK. Older repo names and prior baselines are superseded and should not be referenced for future implementation work.

## Product definition
SETU TRACK is a **Timesheet + Payroll SaaS platform** for contractor-heavy teams. The product direction is to evolve from a tracker into a **financial operations platform for contractor teams**.

Primary operational loop:

**time logged → approved → payroll run → exports → financial visibility**

## Current architecture

### Frontend
- Next.js 14 App Router
- TypeScript
- Tailwind CSS + custom global token layer
- AppShell layout with SETU branding

### Backend
- Supabase Auth + Postgres
- Row Level Security by org
- Service-role route handlers for privileged payroll/export workflows

### Roles
- **Admin**: full org control, payroll lock, export control, org settings
- **Manager**: approval workflows, reporting visibility within org/project constraints
- **Contractor**: time entry, profile completion, pay visibility

## Domain structure introduced in this baseline
Business logic should move toward domain services rather than staying inside pages.

- `src/lib/domain/time/weekly.ts`
  - week boundary helpers
  - daily totals and overtime detection
- `src/lib/domain/approvals/queue.ts`
  - approval queue grouping
  - anomaly detection
  - queue summarization
- `src/lib/domain/payroll/closeChecklist.ts`
  - payroll lock validation checklist generation
- `src/lib/domain/payroll/intelligence.ts`
  - variance helpers for future analytics expansion

## Core modules in the baseline
- Dashboard
- My Work / Timesheet
- Approvals
- Projects
- People
- Payroll report
- Payroll runs
- Export center
- Org settings
- Billing placeholder

## Phase 2A implementation included here
### 1. Approvals workflow upgrade
- Queue-first approvals endpoint: `GET /api/approvals/queue`
- Bulk approval route supports either `items[]` or `entry_ids[]`
- Approval notes are persisted through `approval_events`
- Approval queue surfaces anomaly flags:
  - missing time
  - overtime
  - missing rate
  - rate mismatch
  - incomplete profile

### 2. Payroll intelligence prep
- Added foundation schema for:
  - `project_budgets`
  - `payroll_snapshots`
  - `approval_events`
- Added payroll close checklist API: `POST /api/pay-period/checklist`
- Admin dashboard now uses a checklist-oriented close validation flow

### 3. UI system cleanup
- Approval page upgraded toward an operational queue layout with summary metrics, anomaly chips, and recent note history
- Existing SETU token/layout foundation remains the visual source of truth

## Database changes in this baseline
New migration:
- `supabase/migrations/0025_phase_2a_foundation.sql`

This migration adds foundational schema only. It is intentionally additive and designed not to break current working modules.

## Release posture
This repo is the **single source of truth** moving forward.
Future work should branch from this baseline and update these docs rather than re-introducing references to prior repos.


## Phase 2B — Financial Intelligence Layer
- project budget tracking is now schema-backed with billing rate + cost tracking fields
- contractor payroll completeness now supports score-based readiness checks
- payroll export ledger now records audit-ready export history
- payroll run detail now exposes project allocation + export history context
