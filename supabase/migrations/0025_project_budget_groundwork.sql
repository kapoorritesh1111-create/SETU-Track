-- Phase 2E groundwork: project budget vs actual
-- Adds optional budget fields to projects so the next product pass can turn
-- project labor cost into a true management surface.

alter table if exists public.projects
  add column if not exists budget_hours numeric,
  add column if not exists budget_amount numeric,
  add column if not exists budget_currency text not null default 'USD';

comment on column public.projects.budget_hours is 'Optional monthly or active planning hour target for a project.';
comment on column public.projects.budget_amount is 'Optional labor budget target for budget-vs-actual reporting.';
comment on column public.projects.budget_currency is 'Display currency for project budget reporting.';
