# SETU BUILD FIX — 2026-03-08 18:14 PM

## Build issue fixed

Vercel failed during prerender because `useSearchParams()` was being called directly inside page components for:

- `/analytics`
- `/reports/payroll`

In Next.js App Router production builds, client pages that use `useSearchParams()` at the page level must be wrapped in a `Suspense` boundary.

## Fix applied

- Updated `src/app/analytics/page.tsx`
  - moved page implementation into `AnalyticsPageContent`
  - wrapped the exported page in `<Suspense>` with a lightweight loading fallback

- Updated `src/app/reports/payroll/page.tsx`
  - moved page implementation into `PayrollReportPageContent`
  - wrapped the exported page in `<Suspense>` with a lightweight loading fallback

## Notes

The CSS `autoprefixer` warnings in `globals.css` are warnings only and were not the cause of the build failure.
