-- 0025_phase_2a_foundation.sql
-- Phase 2A foundation tables for approvals workflow history + payroll intelligence.

begin;

create table if not exists public.project_budgets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  budget_amount numeric not null default 0,
  currency text not null default 'USD',
  effective_from date not null default current_date,
  effective_to date null,
  note text null,
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null
);

create index if not exists project_budgets_org_project_idx
  on public.project_budgets (org_id, project_id, effective_from desc);

alter table public.project_budgets enable row level security;

drop policy if exists project_budgets_select_org on public.project_budgets;
create policy project_budgets_select_org
on public.project_budgets
for select
to authenticated
using (org_id = public.current_org_id());

drop policy if exists project_budgets_admin_write on public.project_budgets;
create policy project_budgets_admin_write
on public.project_budgets
for all
to authenticated
using (org_id = public.current_org_id() and public.current_role() = 'admin')
with check (org_id = public.current_org_id() and public.current_role() = 'admin');

create table if not exists public.payroll_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  payroll_run_id uuid null references public.payroll_runs(id) on delete set null,
  project_id uuid null references public.projects(id) on delete set null,
  person_id uuid null references public.profiles(id) on delete set null,
  snapshot_key text not null,
  period_start date not null,
  period_end date not null,
  total_hours numeric not null default 0,
  total_amount numeric not null default 0,
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null
);

create index if not exists payroll_snapshots_org_period_idx
  on public.payroll_snapshots (org_id, period_start desc, period_end desc);

alter table public.payroll_snapshots enable row level security;

drop policy if exists payroll_snapshots_select_org on public.payroll_snapshots;
create policy payroll_snapshots_select_org
on public.payroll_snapshots
for select
to authenticated
using (org_id = public.current_org_id() and public.current_role() in ('admin','manager'));

drop policy if exists payroll_snapshots_admin_write on public.payroll_snapshots;
create policy payroll_snapshots_admin_write
on public.payroll_snapshots
for all
to authenticated
using (org_id = public.current_org_id() and public.current_role() = 'admin')
with check (org_id = public.current_org_id() and public.current_role() = 'admin');

create table if not exists public.approval_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  action text not null check (action in ('approved','rejected','note')),
  note text null,
  entry_count integer not null default 0,
  actor_id uuid null references public.profiles(id) on delete set null,
  actor_name text null,
  created_at timestamptz not null default now()
);

create index if not exists approval_events_org_week_idx
  on public.approval_events (org_id, week_start desc, user_id, created_at desc);

alter table public.approval_events enable row level security;

drop policy if exists approval_events_select_org on public.approval_events;
create policy approval_events_select_org
on public.approval_events
for select
to authenticated
using (org_id = public.current_org_id() and public.current_role() in ('admin','manager'));

drop policy if exists approval_events_insert_manager_admin on public.approval_events;
create policy approval_events_insert_manager_admin
on public.approval_events
for insert
to authenticated
with check (
  org_id = public.current_org_id()
  and public.current_role() in ('admin','manager')
  and coalesce(actor_id, auth.uid()) = auth.uid()
);

commit;
