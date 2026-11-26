-- Issue #13: persistent review history, including alerts no longer detected.
-- Read-only manager-only RPC; does not auto-resolve vanished candidates.
begin;
create or replace function public.analytics_return_audit_history_v1(
 p_company_id bigint default null,
 p_status text default null,
 p_limit integer default 50,
 p_offset integer default 0
)
returns table(
 case_key text, company_id bigint, rule_code text, review_status text,
 review_version integer, reviewer_note text, reviewed_at timestamptz,
 reviewed_by uuid, created_at timestamptz,
 currently_detected boolean, transition_count bigint
)
language plpgsql stable security definer
set search_path=public,auth
as $$
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
   raise exception 'AUTH_REQUIRED' using errcode='42501';
 end if;
 if not exists(select 1 from public.app_user_roles u where
     u.user_id=auth.uid() and u.is_active=true and u.role in ('manager','admin')) then
   raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';
 end if;
 if p_company_id is not null and p_company_id not in
       (select public.authorized_company_ids()) then
   raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';
 end if;
 if p_status is not null and p_status not in
   ('new','investigating','explained','confirmed_error','resolved','dismissed') then
   raise exception 'INVALID_STATUS';
 end if;
 return query
 select r.case_key,r.company_id,r.rule_code,r.status,r.version,
        r.reviewer_note,r.reviewed_at,r.reviewed_by,r.created_at,
        exists(
         select 1 from public.otc_return_audit_candidates_v1 a
         where a.company_id=r.company_id
           and public.otc_return_audit_case_key(a.rule_code,a.company_id,
                a.sale_order_line_id,a.product_id,a.return_move_ids)=r.case_key
        ) as currently_detected,
        (select count(*) from public.otc_return_audit_review_events e
          where e.case_key=r.case_key)::bigint as transition_count
 from public.otc_return_audit_reviews r
 where r.company_id in (select public.authorized_company_ids())
   and (p_company_id is null or r.company_id=p_company_id)
   and (p_status is null or r.status=p_status)
 order by r.reviewed_at desc nulls last,r.case_key
 limit least(greatest(coalesce(p_limit,50),1),200)
 offset greatest(coalesce(p_offset,0),0);
end;
$$;
revoke all on function public.analytics_return_audit_history_v1(bigint,text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.analytics_return_audit_history_v1(bigint,text,integer,integer)
 to authenticated;

create or replace function public.analytics_return_audit_history_events_v1(
 p_case_key text
)
returns table(
 event_id bigint,case_key text,from_status text,to_status text,
 actor_id uuid,note text,occurred_at timestamptz
)
language plpgsql stable security definer
set search_path=public,auth
as $$
declare v_company bigint;
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
   raise exception 'AUTH_REQUIRED' using errcode='42501';
 end if;
 if not exists(select 1 from public.app_user_roles u where
    u.user_id=auth.uid() and u.is_active=true and u.role in ('manager','admin')) then
   raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';
 end if;
 select r.company_id into v_company from public.otc_return_audit_reviews r
 where r.case_key=p_case_key;
 if not found then raise exception 'CASE_NOT_FOUND'; end if;
 if v_company not in (select public.authorized_company_ids()) then
   raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';
 end if;
 return query
 select e.id,e.case_key,e.from_status,e.to_status,e.actor_id,e.note,e.occurred_at
 from public.otc_return_audit_review_events e
 where e.case_key=p_case_key and e.company_id=v_company
 order by e.occurred_at asc,e.id asc;
end;
$$;
revoke all on function public.analytics_return_audit_history_events_v1(text)
 from public,anon,authenticated;
grant execute on function public.analytics_return_audit_history_events_v1(text)
 to authenticated;
commit;
