-- PROPOSAL ONLY. Run on ephemeral GitHub PostgreSQL with existing OTC fixtures.
-- Prerequisite: returns-cohort-case-review-PROPOSAL.sql (not a production migration).
begin;
create table public.otc_return_case_assignments (
 case_key text primary key references public.otc_return_audit_case_order_links(case_key),
 company_id bigint not null check(company_id in (1,2)),
 assignee_id uuid not null,
 priority text not null check(priority in ('low','medium','high','critical')),
 due_date date not null,
 assignment_version integer not null default 1 check(assignment_version>=1),
 assigned_by uuid not null,
 assigned_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index otc_case_assignments_due_idx on public.otc_return_case_assignments(company_id,due_date);
create table public.otc_return_case_assignment_events(
 id bigint generated always as identity primary key,
 case_key text not null references public.otc_return_audit_case_order_links(case_key),
 company_id bigint not null,
 from_assignee_id uuid,
 to_assignee_id uuid not null,
 from_priority text,
 to_priority text not null,
 from_due_date date,
 to_due_date date not null,
 previous_version integer not null,
 new_version integer not null,
 actor_id uuid not null,
 reason text not null check(length(btrim(reason)) between 5 and 2000),
 occurred_at timestamptz not null default now()
);
create index otc_assignment_events_case_idx on public.otc_return_case_assignment_events(case_key,id);
alter table public.otc_return_case_assignments enable row level security;
alter table public.otc_return_case_assignment_events enable row level security;
revoke all on public.otc_return_case_assignments,public.otc_return_case_assignment_events from public,anon,authenticated;
grant all on public.otc_return_case_assignments,public.otc_return_case_assignment_events to service_role;
grant usage,select on sequence public.otc_return_case_assignment_events_id_seq to service_role;

create or replace function public.analytics_returns_case_worklist_v1(
 p_company_id bigint default null,p_include_closed boolean default false,
 p_limit integer default 100,p_offset integer default 0)
returns table (
 case_key text,company_id bigint,order_id bigint,assignee_id uuid,
 priority text,due_date date,assignment_version integer,review_status text,
 is_overdue boolean,currently_detected boolean
)
language plpgsql stable security definer set search_path=pg_catalog,public,auth
as $$
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
   raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.app_user_roles u where u.user_id=auth.uid()
    and u.is_active and u.role in ('manager','admin')) then
   raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';end if;
 if p_company_id is not null and p_company_id not in(select public.authorized_company_ids()) then
   raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 100 or p_offset is null
    or p_offset not between 0 and 10000 then raise exception 'INVALID_PAGINATION';end if;
 return query select m.case_key,m.company_id,m.order_id,a.assignee_id,
   a.priority,a.due_date,a.assignment_version,r.status,
   (a.due_date < (now() at time zone 'Africa/Cairo')::date
    and r.status not in('resolved','dismissed','explained')) as is_overdue,
   exists(select 1 from public.otc_return_audit_candidates_v1 c
     where c.company_id=m.company_id and public.otc_return_audit_case_key(
       c.rule_code,c.company_id,c.sale_order_line_id,c.product_id,c.return_move_ids)=m.case_key)
 from public.otc_return_case_assignments a
 join public.otc_return_audit_case_order_links m on m.case_key=a.case_key
 join public.otc_return_audit_reviews r on r.case_key=m.case_key and r.company_id=m.company_id
 where a.company_id=m.company_id and m.company_id in(select public.authorized_company_ids())
   and (p_company_id is null or m.company_id=p_company_id)
   and (p_include_closed or r.status not in('resolved','dismissed','explained'))
 order by (a.due_date < (now() at time zone 'Africa/Cairo')::date
   and r.status not in('resolved','dismissed','explained')) desc,
   case a.priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
   a.due_date,m.case_key
 limit p_limit offset p_offset;
end;
$$;
revoke all on function public.analytics_returns_case_worklist_v1(bigint,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.analytics_returns_case_worklist_v1(bigint,boolean,integer,integer) to authenticated;

create or replace function public.assign_returns_order_case_v1(
 p_company_id bigint,p_order_id bigint,p_case_key text,p_assignee_id uuid,
 p_priority text,p_due_date date,p_expected_version integer,p_reason text)
returns table(case_key text,assignment_version integer,assigned_at timestamptz)
language plpgsql volatile security definer set search_path=pg_catalog,public,auth
as $$
declare v_previous record;v_exists boolean;v_new_version integer;
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
  raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.app_user_roles u where u.user_id=auth.uid()
    and u.is_active and u.role in ('manager','admin')) then
  raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';end if;
 if p_company_id is null or p_order_id is null or p_case_key is null
    or p_case_key !~ '^[a-f0-9]{32}$'
    or p_company_id not in(select public.authorized_company_ids()) then
  raise exception 'INVALID_SCOPE' using errcode='42501';end if;
 if not exists(select 1 from public.otc_return_audit_case_order_links m
   join public.otc_return_audit_reviews r on r.case_key=m.case_key
   where m.case_key=p_case_key and m.company_id=p_company_id
     and m.order_id=p_order_id and r.company_id=p_company_id) then
   raise exception 'CASE_NOT_LINKED_TO_ORDER' using errcode='42501';end if;
 if p_assignee_id is null or not exists(select 1 from public.app_user_roles u
    where u.user_id=p_assignee_id and u.is_active and u.company_id=p_company_id) then
   raise exception 'ASSIGNEE_NOT_ACTIVE_IN_COMPANY' using errcode='42501';end if;
 if p_priority is null or p_priority not in('low','medium','high','critical')
   then raise exception 'INVALID_PRIORITY';end if;
 if p_due_date is null or p_due_date<(now() at time zone 'Africa/Cairo')::date
   or p_due_date>(now() at time zone 'Africa/Cairo')::date+90
   then raise exception 'INVALID_DUE_DATE';end if;
 if p_expected_version is null or p_expected_version<0 then
   raise exception 'INVALID_VERSION';end if;
 if p_reason is null or length(btrim(p_reason)) not between 5 and 2000 then
   raise exception 'REASON_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_case_key,42));
 select a.* into v_previous from public.otc_return_case_assignments a
   where a.case_key=p_case_key for update;
 v_exists:=found;
 if (case when v_exists then v_previous.assignment_version else 0 end)<>p_expected_version then
   raise exception 'ASSIGNMENT_VERSION_CONFLICT';end if;
 if v_exists and v_previous.assignee_id=p_assignee_id and
   v_previous.priority=p_priority and v_previous.due_date=p_due_date then
   raise exception 'NO_ASSIGNMENT_CHANGE';end if;
 v_new_version:=p_expected_version+1;
 insert into public.otc_return_case_assignments
 (case_key,company_id,assignee_id,priority,due_date,assignment_version,assigned_by)
 values(p_case_key,p_company_id,p_assignee_id,p_priority,p_due_date,v_new_version,auth.uid())
 on conflict on constraint otc_return_case_assignments_pkey do update
 set assignee_id=excluded.assignee_id,priority=excluded.priority,due_date=excluded.due_date,
     assignment_version=excluded.assignment_version,assigned_by=excluded.assigned_by,
     updated_at=now();
 insert into public.otc_return_case_assignment_events
 (case_key,company_id,from_assignee_id,to_assignee_id,from_priority,to_priority,
   from_due_date,to_due_date,previous_version,new_version,actor_id,reason)
 values(p_case_key,p_company_id,case when v_exists then v_previous.assignee_id end,
   p_assignee_id,case when v_exists then v_previous.priority end,p_priority,
   case when v_exists then v_previous.due_date end,p_due_date,p_expected_version,v_new_version,
   auth.uid(),btrim(p_reason));
 return query select a.case_key,a.assignment_version,a.assigned_at
 from public.otc_return_case_assignments a where a.case_key=p_case_key;
end;
$$;
revoke all on function public.assign_returns_order_case_v1(bigint,bigint,text,uuid,text,date,integer,text)
 from public,anon,authenticated;
grant execute on function public.assign_returns_order_case_v1(bigint,bigint,text,uuid,text,date,integer,text) to authenticated;
commit;
