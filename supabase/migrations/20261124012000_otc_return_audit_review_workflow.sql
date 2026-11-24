-- Issue #13: explicit UoM evidence gate and immutable manager review log.
-- No corrections to Odoo or commercial snapshots. Apply only after review.
begin;
create table public.otc_return_audit_reviews (
  case_key text primary key,
  company_id bigint not null check (company_id in (1,2)),
  rule_code text not null,
  status text not null default 'new'
    check (status in ('new','investigating','explained','confirmed_error','resolved','dismissed')),
  version integer not null default 0 check (version>=0),
  reviewed_by uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.otc_return_audit_review_events (
  id bigint generated always as identity primary key,
  case_key text not null references public.otc_return_audit_reviews(case_key),
  company_id bigint not null,
  from_status text not null,
  to_status text not null,
  actor_id uuid not null,
  note text not null check (length(btrim(note)) between 5 and 2000),
  occurred_at timestamptz not null default now()
);
create index otc_return_audit_review_events_case_idx
  on public.otc_return_audit_review_events(case_key,occurred_at desc);
alter table public.otc_return_audit_reviews enable row level security;
alter table public.otc_return_audit_review_events enable row level security;
revoke all on public.otc_return_audit_reviews,public.otc_return_audit_review_events
  from public,anon,authenticated;
grant all on public.otc_return_audit_reviews,public.otc_return_audit_review_events to service_role;
grant usage,select on sequence public.otc_return_audit_review_events_id_seq to service_role;

create or replace function public.otc_return_audit_case_key(
 p_rule_code text,p_company_id bigint,p_sale_order_line_id bigint,
 p_product_id bigint,p_return_move_ids bigint[]
)
returns text language sql immutable as $$
 select md5(concat_ws('|',p_rule_code,p_company_id::text,
   coalesce(p_sale_order_line_id::text,'NULL'),p_product_id::text,
   coalesce((select string_agg(m::text,',' order by m)
             from unnest(p_return_move_ids) m),'NULL')))
$$;
revoke all on function public.otc_return_audit_case_key(text,bigint,bigint,bigint,bigint[]) from public,anon,authenticated;
grant execute on function public.otc_return_audit_case_key(text,bigint,bigint,bigint,bigint[]) to service_role;

-- Returns only current detection candidates, never claims that missing records are cleared.
create or replace function public.analytics_return_audit_review_queue_v1(
 p_company_id bigint default null,
 p_rule_code text default null,
 p_limit integer default 50,
 p_offset integer default 0
)
returns table(
  case_key text, rule_code text, company_id bigint,
  sale_order_line_id bigint, product_id bigint, return_move_ids bigint[],
  delivered_qty numeric, returned_qty numeric, confidence text,
  explanation text, review_status text, review_version integer,
  reviewer_note text, reviewed_at timestamptz
)
language plpgsql stable security definer
set search_path=public,auth
as $$
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
   raise exception 'AUTH_REQUIRED' using errcode='42501';
 end if;
 if not exists(select 1 from public.app_user_roles
    where user_id=auth.uid() and is_active=true and role in ('manager','admin')) then
   raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';
 end if;
 if p_company_id is not null and p_company_id not in (select public.authorized_company_ids()) then
   raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';
 end if;
 return query
 select public.otc_return_audit_case_key(a.rule_code,a.company_id,
      a.sale_order_line_id,a.product_id,a.return_move_ids),
    a.rule_code,a.company_id,a.sale_order_line_id,a.product_id,a.return_move_ids,
    a.delivered_qty,a.returned_qty,a.confidence,a.explanation,
    coalesce(v.status,'new'),coalesce(v.version,0),v.reviewer_note,v.reviewed_at
 from public.otc_return_audit_candidates_v1 a
 left join public.otc_return_audit_reviews v
   on v.case_key=public.otc_return_audit_case_key(a.rule_code,a.company_id,
        a.sale_order_line_id,a.product_id,a.return_move_ids)
 where a.company_id in (select public.authorized_company_ids())
   and (p_company_id is null or a.company_id=p_company_id)
   and (p_rule_code is null or a.rule_code=p_rule_code)
 order by a.company_id,a.rule_code,a.sale_order_line_id nulls last,
          a.product_id,a.return_move_ids
 limit least(greatest(coalesce(p_limit,50),1),200)
 offset greatest(coalesce(p_offset,0),0);
end;
$$;
revoke all on function public.analytics_return_audit_review_queue_v1(bigint,text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.analytics_return_audit_review_queue_v1(bigint,text,integer,integer)
 to authenticated;

-- Optimistic concurrency to prevent one reviewer overwriting another's decision.
-- Caller must supply the case key read from the queue and expected current version.
create or replace function public.review_return_audit_candidate_v1(
 p_case_key text,
 p_expected_version integer,
 p_status text,
 p_note text
)
returns table(case_key text,status text,version integer,reviewed_at timestamptz)
language plpgsql volatile security definer
set search_path=public,auth
as $$
declare v_company bigint; v_rule text; v_old text; v_version integer;
        v_row record; v_present boolean;
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
   raise exception 'AUTH_REQUIRED' using errcode='42501';
 end if;
 if not exists(select 1 from public.app_user_roles
   where user_id=auth.uid() and is_active=true and role in ('manager','admin')) then
   raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';
 end if;
 if p_case_key is null or p_case_key !~ '^[a-f0-9]{32}$' then
   raise exception 'INVALID_CASE_KEY';
 end if;
 if p_expected_version is null or p_expected_version<0 then
   raise exception 'INVALID_VERSION';
 end if;
 if p_status not in ('investigating','explained','confirmed_error','resolved','dismissed') or p_status is null then
   raise exception 'INVALID_STATUS';
 end if;
 if p_note is null or length(btrim(p_note)) not between 5 and 2000 then
   raise exception 'REVIEW_NOTE_REQUIRED';
 end if;
 -- Serialize concurrent writes for the same case, even before initial insert.
 perform pg_advisory_xact_lock(hashtextextended(p_case_key,0));
 select a.company_id,a.rule_code into v_company,v_rule
 from public.otc_return_audit_candidates_v1 a
 where public.otc_return_audit_case_key(a.rule_code,a.company_id,
   a.sale_order_line_id,a.product_id,a.return_move_ids)=p_case_key
 limit 1;
 if not found then raise exception 'CASE_NOT_IN_CURRENT_SNAPSHOT'; end if;
 if v_company not in (select public.authorized_company_ids()) then
   raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';
 end if;
 select r.status,r.version into v_old,v_version
 from public.otc_return_audit_reviews r where r.case_key=p_case_key for update;
 v_present:=found;
 if not v_present then v_old:='new';v_version:=0;end if;
 if v_version<>p_expected_version then raise exception 'REVIEW_VERSION_CONFLICT';end if;
 if v_old=p_status then raise exception 'NO_STATUS_CHANGE';end if;
 if not v_present then
   insert into public.otc_return_audit_reviews
    (case_key,company_id,rule_code,status,version,reviewed_by,reviewed_at,reviewer_note,updated_at)
   values(p_case_key,v_company,v_rule,p_status,1,auth.uid(),now(),btrim(p_note),now());
 else
   update public.otc_return_audit_reviews r
   set status=p_status,version=r.version+1,reviewed_by=auth.uid(),
       reviewed_at=now(),reviewer_note=btrim(p_note),updated_at=now()
   where r.case_key=p_case_key;
 end if;
 insert into public.otc_return_audit_review_events
    (case_key,company_id,from_status,to_status,actor_id,note)
 values(p_case_key,v_company,v_old,p_status,auth.uid(),btrim(p_note));
 return query select r.case_key,r.status,r.version,r.reviewed_at
  from public.otc_return_audit_reviews r where r.case_key=p_case_key;
end;
$$;
revoke all on function public.review_return_audit_candidate_v1(text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.review_return_audit_candidate_v1(text,integer,text,text)
 to authenticated;
commit;
