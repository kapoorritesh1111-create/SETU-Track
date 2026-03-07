-- 0026_phase_2b_financial_intelligence.sql
-- Phase 2B financial intelligence layer: richer project budgets, contractor payroll completeness, and export ledger.

begin;

alter table public.project_budgets
  add column if not exists billing_rate numeric not null default 0,
  add column if not exists cost_tracking_enabled boolean not null default true;

alter table public.profiles
  add column if not exists country text,
  add column if not exists payment_details jsonb not null default '{}'::jsonb,
  add column if not exists tax_information jsonb not null default '{}'::jsonb;

create table if not exists public.export_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  payroll_run_id uuid null references public.payroll_runs(id) on delete set null,
  export_event_id uuid null references public.export_events(id) on delete set null,
  project_export_id uuid null references public.project_exports(id) on delete set null,
  export_type text not null,
  file_format text not null default 'csv',
  exported_at timestamptz not null default now(),
  exported_by uuid null references public.profiles(id) on delete set null,
  exported_by_name text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists export_history_org_exported_at_idx
  on public.export_history (org_id, exported_at desc);

create index if not exists export_history_run_idx
  on public.export_history (org_id, payroll_run_id, exported_at desc);

alter table public.export_history enable row level security;

drop policy if exists export_history_select_org_admin_manager on public.export_history;
create policy export_history_select_org_admin_manager
on public.export_history
for select
to authenticated
using (org_id = public.current_org_id() and public.current_role() in ('admin','manager'));

drop policy if exists export_history_insert_admin_manager on public.export_history;
create policy export_history_insert_admin_manager
on public.export_history
for insert
to authenticated
with check (org_id = public.current_org_id() and public.current_role() in ('admin','manager'));

commit;
