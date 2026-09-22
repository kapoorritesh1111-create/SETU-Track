-- 0025_multi_tenant_org_foundation.sql
-- Prepare SETU Track for safe multi-organization onboarding without changing
-- existing Timesheet Webapp memberships or operational data.

begin;

-- 1) Platform administration is separate from tenant roles.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

alter table public.platform_admins enable row level security;

-- No client policies by design. Platform admin checks are server-side through
-- the service role only.

-- Seed the existing SETU Track administrator as the first platform admin.
insert into public.platform_admins (user_id)
select id
from auth.users
where lower(email) = 'kapoorritesh1111@gmail.com'
on conflict (user_id) do nothing;

-- 2) Add Owner as an organization-level role while preserving current roles.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['owner'::text, 'admin'::text, 'manager'::text, 'contractor'::text]));

-- 3) New Auth users must never be silently attached to the legacy/default org.
-- Admin invite APIs assign the intended org using the service role immediately
-- after Supabase creates the Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, org_id, full_name, role, hourly_rate)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'contractor',
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- 4) Existing admin helpers should treat Owner as an organization admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(
    (select role in ('owner','admin') from public.profiles where id = auth.uid()),
    false
  );
$function$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select public.current_role() in ('owner','admin','manager');
$function$;

-- 5) Close a confirmed RLS gap on audit_log before introducing another tenant.
alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_org_admin on public.audit_log;
create policy audit_log_select_org_admin
on public.audit_log
for select
to authenticated
using (
  org_id = public.current_org_id()
  and public.current_role() in ('owner','admin')
);

commit;
