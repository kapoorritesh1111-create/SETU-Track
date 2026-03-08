# SETU BUILD FIX — 2026-03-08 12:53 PM

Fixed payroll report type error in `src/app/reports/payroll/page.tsx`.

## Root cause
`awaiting_export` is part of `payment_status`, not `export_status`.

## Fix
Updated executive summary logic:
- kept `row.export_status === "not_generated"`
- changed second check to `row.payment_status === "awaiting_export"`
