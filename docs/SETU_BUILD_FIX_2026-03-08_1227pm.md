# SETU TRACK Build Fix — 2026-03-08 12:27pm

## Issue
Vercel production build failed on `src/app/reports/payroll/page.tsx` because `export_status` was typed as `"not_generated" | "generated" | "linked"`, but the page compared it against `"awaiting_export"`, which belongs to `payment_status`.

## Fix
- Updated the payroll report executive summary to count awaiting export rows using:
  - `row.export_status === "not_generated"`
  - `row.payment_status === "awaiting_export"`

## Why
This aligns the UI summary logic with the API domain model:
- `export_status` answers whether an export exists / is linked
- `payment_status` answers whether the row is awaiting export, awaiting payment, or paid
