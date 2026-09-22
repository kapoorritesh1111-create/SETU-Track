-- 0026_owner_permissions_hardening.sql
-- Extend existing tenant permissions so Owner has full org-admin capability
-- while preventing Super Admins from promoting/demoting Owners.

begin;

alter policy approval_events_insert_manager_admin on public.approval_events
  with check (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text])
    and coalesce(actor_id, auth.uid()) = auth.uid()
  );

alter policy approval_events_select_org on public.approval_events
  using (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text])
  );

alter policy export_events_insert_admin on public.export_events
  with check (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text])
    and actor_id = auth.uid()
  );

alter policy export_events_select_org_admin_manager on public.export_events
  using (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text])
  );

alter policy export_history_insert_admin_manager on public.export_history
  with check (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text])
  );

alter policy export_history_select_org_admin_manager on public.export_history
  using (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text])
  );

alter policy org_settings_update_admin on public.org_settings
  using (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id())
  with check (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id());

alter policy org_settings_upsert_admin on public.org_settings
  with check (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id());

alter policy "admins manage pay periods" on public.pay_periods
  using (public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy pay_periods_admin_all on public.pay_periods
  using (public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy payroll_run_entries_admin_all on public.payroll_run_entries
  using (public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy payroll_run_lines_admin_all on public.payroll_run_lines
  using (public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy payroll_runs_admin_all on public.payroll_runs
  using (public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy payroll_snapshots_admin_write on public.payroll_snapshots
  using (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy payroll_snapshots_select_org on public.payroll_snapshots
  using (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text]));

alter policy profiles_update_admin_org on public.profiles
  using (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id())
  with check (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id());

alter policy profiles_update_manager_team on public.profiles
  using (
    org_id = public.current_org_id()
    and public.is_admin_or_manager()
    and (public.current_role() = any (array['owner'::text,'admin'::text]) or manager_id = auth.uid())
  )
  with check (
    org_id = public.current_org_id()
    and public.is_admin_or_manager()
    and (public.current_role() = any (array['owner'::text,'admin'::text]) or manager_id = auth.uid())
  );

alter policy project_budgets_admin_write on public.project_budgets
  using (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy project_exports_insert_admin on public.project_exports
  with check (
    org_id = public.current_org_id()
    and public.current_role() = any (array['owner'::text,'admin'::text])
    and created_by = auth.uid()
  );

alter policy project_exports_select_org_admin_manager on public.project_exports
  using (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text,'manager'::text]));

alter policy project_exports_update_admin on public.project_exports
  using (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]))
  with check (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy projects_admin_delete on public.projects
  using (org_id = public.current_org_id() and public.current_role() = any (array['owner'::text,'admin'::text]));

alter policy projects_update_admin_manager on public.projects
  using (
    org_id = (select profiles.org_id from public.profiles where profiles.id = auth.uid())
    and (select profiles.role from public.profiles where profiles.id = auth.uid())
      = any (array['owner'::text,'admin'::text,'manager'::text])
  )
  with check (
    org_id = (select profiles.org_id from public.profiles where profiles.id = auth.uid())
    and (select profiles.role from public.profiles where profiles.id = auth.uid())
      = any (array['owner'::text,'admin'::text,'manager'::text])
  );

alter policy te_manager_approve on public.time_entries
  using (
    (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id())
    or (public.current_role() = 'manager'::text and user_id in (select p.id from public.profiles p where p.manager_id = auth.uid()))
  )
  with check (
    (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id())
    or (public.current_role() = 'manager'::text and user_id in (select p.id from public.profiles p where p.manager_id = auth.uid()))
  );

alter policy te_select on public.time_entries
  using (
    user_id = auth.uid()
    or (public.current_role() = any (array['owner'::text,'admin'::text]) and org_id = public.current_org_id())
    or (public.current_role() = 'manager'::text and user_id in (select p.id from public.profiles p where p.manager_id = auth.uid()))
  );

create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  actor_role text;
  db_role text;
  other_active_owners integer;
begin
  begin
    db_role := current_setting('role', true);
  exception when others then
    db_role := null;
  end;

  if db_role = 'service_role' then
    return new;
  end if;

  select p.role into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role = 'owner' then
    if old.role = 'owner' and (new.role <> 'owner' or new.is_active = false) then
      select count(*) into other_active_owners
      from public.profiles p
      where p.org_id = old.org_id
        and p.role = 'owner'
        and p.is_active = true
        and p.id <> old.id;

      if other_active_owners = 0 then
        raise exception 'At least one active Owner is required.';
      end if;
    end if;
    return new;
  end if;

  if actor_role = 'admin' then
    if old.role = 'owner' or new.role = 'owner' then
      raise exception 'Only an Owner can manage Owner access.';
    end if;
    return new;
  end if;

  if actor_role = 'manager' then
    if new.id = auth.uid() then
      return new;
    end if;
    if old.manager_id = auth.uid() then
      return new;
    end if;
    raise exception 'Managers can only update profiles assigned to them.';
  end if;

  if actor_role = 'contractor' then
    if new.id <> auth.uid() then
      raise exception 'Contractors can only update their own profile.';
    end if;

    if new.phone is distinct from old.phone
      or new.address is distinct from old.address
      or new.avatar_url is distinct from old.avatar_url
      or new.ui_prefs is distinct from old.ui_prefs
    then
      return new;
    end if;

    raise exception 'Contractors can only update phone/address/avatar_url/ui_prefs.';
  end if;

  raise exception 'Unauthorized profile update attempt.';
end;
$function$;

do $$
declare
  ddl text;
begin
  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='admin_dashboard_summary'
    and pg_get_function_identity_arguments(p.oid)='p_period_start date, p_period_end date';
  ddl := replace(ddl, 'if v_role <> ''admin'' then', 'if v_role not in (''owner'',''admin'') then');
  execute ddl;

  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='close_payroll_period'
    and pg_get_function_identity_arguments(p.oid)='p_period_start date, p_period_end date';
  ddl := replace(ddl, 'if v_role <> ''admin'' then', 'if v_role not in (''owner'',''admin'') then');
  execute ddl;

  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='mark_payroll_run_paid'
    and pg_get_function_identity_arguments(p.oid)='p_run_id uuid, p_paid boolean, p_note text';
  ddl := replace(ddl, 'if v_role <> ''admin'' then', 'if v_role not in (''owner'',''admin'') then');
  execute ddl;

  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='enforce_time_entry_workflow'
    and pg_get_function_identity_arguments(p.oid)='';
  ddl := replace(ddl, 'not in (''admin'',''manager'')', 'not in (''owner'',''admin'',''manager'')');
  ddl := replace(ddl, 'in (''admin'',''manager'')', 'in (''owner'',''admin'',''manager'')');
  execute ddl;

  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='prevent_snapshot_change'
    and pg_get_function_identity_arguments(p.oid)='';
  ddl := replace(ddl, 'if public.current_role() <> ''admin'' then', 'if public.current_role() not in (''owner'',''admin'') then');
  execute ddl;
end $$;

alter function public.admin_dashboard_summary(date,date) set search_path = public;
alter function public.close_payroll_period(date,date) set search_path = public;
alter function public.mark_payroll_run_paid(uuid,boolean,text) set search_path = public;
alter function public.enforce_time_entry_workflow() set search_path = public;
alter function public.prevent_snapshot_change() set search_path = public;

commit;
