-- 0024_project_exports_totals.sql
-- Persist project export totals so payroll summary and receipts can render without reading ad-hoc metadata.

begin;

alter table public.project_exports
  add column if not exists total_hours numeric not null default 0,
  add column if not exists total_amount numeric not null default 0,
  add column if not exists currency text not null default 'USD';

update public.project_exports
set
  total_hours = coalesce(total_hours, nullif(metadata->>'total_hours','')::numeric, 0),
  total_amount = coalesce(total_amount, nullif(metadata->>'total_amount','')::numeric, 0),
  currency = coalesce(nullif(currency, ''), nullif(metadata->>'currency',''), 'USD');

commit;
