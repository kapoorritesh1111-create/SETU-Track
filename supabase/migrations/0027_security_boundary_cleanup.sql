-- 0027_security_boundary_cleanup.sql
-- Tighten exposed database surfaces before onboarding additional tenant organizations.

begin;

-- Respect underlying table RLS when querying the convenience view.
alter view public.v_time_entries set (security_invoker = true);

-- Lock mutable search paths on remaining public helper/trigger functions.
alter function public.ensure_snapshot_on_approve() set search_path = public;
alter function public.prevent_time_entry_mutation_in_locked_period() set search_path = public;
alter function public.prevent_edit_if_pay_period_locked() set search_path = public;
alter function public.pay_periods_sync_week_start() set search_path = public;
alter function public.payroll_close_blockers(date,date) set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- SECURITY DEFINER functions should never be callable anonymously.
-- Keep authenticated/service-role execution for existing RPC and policy helpers.
revoke execute on function public.admin_dashboard_summary(date,date) from public;
revoke execute on function public.close_payroll_period(date,date) from public;
revoke execute on function public.current_org_id() from public;
revoke execute on function public.current_role() from public;
revoke execute on function public.current_user_role() from public;
revoke execute on function public.enforce_time_entry_workflow() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin_or_manager() from public;
revoke execute on function public.mark_payroll_run_paid(uuid,boolean,text) from public;
revoke execute on function public.payroll_close_blockers(date,date) from public;
revoke execute on function public.set_time_entry_snapshots() from public;
revoke execute on function public.set_time_entry_updated_meta() from public;
revoke execute on function public.touch_org_settings() from public;

revoke execute on function public.admin_dashboard_summary(date,date) from anon;
revoke execute on function public.close_payroll_period(date,date) from anon;
revoke execute on function public.current_org_id() from anon;
revoke execute on function public.current_role() from anon;
revoke execute on function public.current_user_role() from anon;
revoke execute on function public.enforce_time_entry_workflow() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin_or_manager() from anon;
revoke execute on function public.mark_payroll_run_paid(uuid,boolean,text) from anon;
revoke execute on function public.payroll_close_blockers(date,date) from anon;
revoke execute on function public.set_time_entry_snapshots() from anon;
revoke execute on function public.set_time_entry_updated_meta() from anon;
revoke execute on function public.touch_org_settings() from anon;

grant execute on function public.admin_dashboard_summary(date,date) to authenticated, service_role;
grant execute on function public.close_payroll_period(date,date) to authenticated, service_role;
grant execute on function public.current_org_id() to authenticated, service_role;
grant execute on function public.current_role() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.enforce_time_entry_workflow() to authenticated, service_role;
grant execute on function public.handle_new_user() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_admin_or_manager() to authenticated, service_role;
grant execute on function public.mark_payroll_run_paid(uuid,boolean,text) to authenticated, service_role;
grant execute on function public.payroll_close_blockers(date,date) to authenticated, service_role;
grant execute on function public.set_time_entry_snapshots() to authenticated, service_role;
grant execute on function public.set_time_entry_updated_meta() to authenticated, service_role;
grant execute on function public.touch_org_settings() to authenticated, service_role;

commit;
