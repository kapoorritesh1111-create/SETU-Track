# ARCHITECTURE

## App structure
- Next.js App Router
- TypeScript
- Supabase Auth + Postgres
- global shell in `src/components/layout/AppShell.tsx`
- canonical brand system in `src/config/brand.ts` + `src/components/brand/BrandLockup.tsx`

## Timesheet flow
- weekly timesheet screen: `src/app/timesheet/page.tsx`
- new entry form: `src/app/entries/new/page.tsx`
- weekly quick-fill and templates are client-driven UX helpers; copied rows remain editable before save/submit

## Dashboard flow
- `src/app/dashboard/page.tsx`
- role-based dashboard surfaces under `src/components/dashboard/*`
- admin dashboard period selector now acts as the primary control for readiness and KPI surfaces

## Branding flow
- all main brand usage should resolve through `BrandLockup`
- asset file changes should only happen in `/public/brand/`
