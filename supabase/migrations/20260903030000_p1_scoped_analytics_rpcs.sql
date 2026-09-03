-- P1 Access Control: trusted authorization scope resolver and scoped analytics foundation.
-- REVIEW GATE: committed for review only; not applied by repository CI.
-- Company IDs verified read-only on 2026-09-03: MAS = 1, Horeca Smart = 2.

begin;

create or replace function public.authorized_company_ids()
returns setof bigint
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_company_id bigint;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select role, company_id
    into v_role, v_company_id
  from public.app_user_roles
  where user_id = v_uid
    and is_active = true;

  if not found then
    raise exception 'ACCESS_PROFILE_UNAVAILABLE' using errcode = '42501';
  end if;

  if v_role = 'sales_rep' then
    if v_company_id is null then
      raise exception 'INVALID_SALES_REP_SCOPE' using errcode = '42501';
    end if;
    return next v_company_id;
    return;
  end if;

  if v_role = 'supervisor' then
    if v_company_id is null then
      raise exception 'INVALID_SUPERVISOR_SCOPE' using errcode = '42501';
    end if;
    return next v_company_id;
    return;
  end if;

  if v_role in ('manager', 'admin') then
    return query select unnest(ARRAY[1::bigint, 2::bigint]);
    return;
  end if;

  raise exception 'INVALID_ROLE_SCOPE' using errcode = '42501';
end;
$$;

create or replace function public.authorized_salesperson_ids()
returns setof bigint
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_company_id bigint;
  v_team_id bigint;
  v_salesperson_id bigint;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select role, company_id, team_id, salesperson_id
    into v_role, v_company_id, v_team_id, v_salesperson_id
  from public.app_user_roles
  where user_id = v_uid
    and is_active = true;

  if not found then
    raise exception 'ACCESS_PROFILE_UNAVAILABLE' using errcode = '42501';
  end if;

  if v_role = 'sales_rep' then
    if v_company_id is null or v_salesperson_id is null then
      raise exception 'INVALID_SALES_REP_SCOPE' using errcode = '42501';
    end if;
    return next v_salesperson_id;
    return;
  end if;

  if v_role = 'supervisor' then
    if v_company_id is null or v_team_id is null then
      raise exception 'INVALID_SUPERVISOR_SCOPE' using errcode = '42501';
    end if;

    if not exists (
      select 1
      from public.sales_teams t
      where t.team_id = v_team_id
        and t.company_id = v_company_id
        and t.supervisor_user_id = v_uid
        and t.is_active = true
    ) then
      raise exception 'INVALID_SUPERVISOR_SCOPE' using errcode = '42501';
    end if;

    return query
      select distinct m.salesperson_id
      from public.sales_team_members m
      join public.sales_teams t on t.team_id = m.team_id
      where m.team_id = v_team_id
        and t.company_id = v_company_id
        and t.is_active = true
        and m.is_active = true;
    return;
  end if;

  if v_role in ('manager', 'admin') then
    return query
      select distinct s.salesperson_id
      from public.sales_orders_odoo18_secure s
      where s.company_id = any(ARRAY[1::bigint, 2::bigint])
        and s.salesperson_id is not null;
    return;
  end if;

  raise exception 'INVALID_ROLE_SCOPE' using errcode = '42501';
end;
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((
    select r.is_active and r.role = 'admin'
    from public.app_user_roles r
    where r.user_id = auth.uid()
  ), false);
$$;

create or replace function public.can_view_executive()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((
    select r.is_active and r.role in ('manager', 'admin')
    from public.app_user_roles r
    where r.user_id = auth.uid()
  ), false);
$$;

revoke all on function public.authorized_company_ids() from public, anon;
revoke all on function public.authorized_salesperson_ids() from public, anon;
revoke all on function public.can_manage_users() from public, anon;
revoke all on function public.can_view_executive() from public, anon;

grant execute on function public.authorized_company_ids() to authenticated;
grant execute on function public.authorized_salesperson_ids() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.can_view_executive() to authenticated;

commit;
