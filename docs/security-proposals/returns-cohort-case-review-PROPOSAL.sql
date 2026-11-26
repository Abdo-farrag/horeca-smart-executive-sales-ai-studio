-- PROPOSAL, GitHub ephemeral PostgreSQL validation only. Do not run on Production.
-- Versioned review events remain authoritative in existing OTC audit tables.
-- This registry persists the business-order link after the underlying alert disappears.
begin;
create table if not exists public.otc_return_audit_case_order_links(
 case_key text primary key references public.otc_return_audit_reviews(case_key),
 company_id bigint not null check(company_id in(1,2)),
 order_id bigint not null,
 sale_order_line_id bigint not null,
 product_id bigint not null,
 linked_at timestamptz not null default now(),
 linked_by uuid not null
);
create index if not exists otc_case_order_lookup_idx
 on public.otc_return_audit_case_order_links(company_id,order_id,linked_at desc);
alter table public.otc_return_audit_case_order_links enable row level security;
revoke all on public.otc_return_audit_case_order_links from public,anon,authenticated;
grant all on public.otc_return_audit_case_order_links to service_role;

-- Manager / company-only per-order alert queue. Read-only, including older
-- mapped reviews that no longer appear in the current source snapshot.
create or replace function public.analytics_returns_cohort_order_cases_v1(
 p_company_id bigint,p_order_id bigint)
returns table(
 case_key text,rule_code text,sale_order_line_id bigint,product_id bigint,
 return_move_ids bigint[],explanation text,review_status text,
 review_version integer,reviewer_note text,reviewed_at timestamptz,
 currently_detected boolean
)
language plpgsql stable security definer
set search_path=pg_catalog,public,auth
as $$
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
  raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.app_user_roles r where
   r.user_id=auth.uid() and r.is_active and r.role in('manager','admin')) then
  raise exception 'RETURNS_REVIEW_MANAGER_REQUIRED' using errcode='42501';end if;
 if p_company_id is null or p_order_id is null or
    p_company_id not in(select public.authorized_company_ids()) then
  raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';end if;
 return query
 with current_cases as materialized(
  select public.otc_return_audit_case_key(a.rule_code,a.company_id,
     a.sale_order_line_id,a.product_id,a.return_move_ids) as k,
   a.rule_code,a.sale_order_line_id,a.product_id,a.return_move_ids,a.explanation
  from public.otc_return_audit_candidates_v1 a
  where a.company_id=p_company_id and a.sale_order_line_id is not null
   and exists(select 1 from public.otc_sale_line_reconciliation_canonical_v1 l
    where l.company_id=p_company_id and l.order_id=p_order_id
      and l.sale_order_line_id=a.sale_order_line_id
      and l.product_id=a.product_id)
 ), linked_history as materialized(
  select m.case_key,m.sale_order_line_id,m.product_id,r.rule_code
  from public.otc_return_audit_case_order_links m
  join public.otc_return_audit_reviews r on r.case_key=m.case_key
  where m.company_id=p_company_id and m.order_id=p_order_id
    and r.company_id=p_company_id
    and exists(select 1 from public.otc_sale_line_reconciliation_canonical_v1 l
     where l.company_id=p_company_id and l.order_id=p_order_id
       and l.sale_order_line_id=m.sale_order_line_id)
 )
 select coalesce(c.k,h.case_key),coalesce(c.rule_code,h.rule_code),
        coalesce(c.sale_order_line_id,h.sale_order_line_id),
        coalesce(c.product_id,h.product_id),
        c.return_move_ids,c.explanation,
        coalesce(r.status,'new'),coalesce(r.version,0),
        r.reviewer_note,r.reviewed_at,
        c.k is not null
 from (select c1.k from current_cases c1 union select h1.case_key from linked_history h1) keys
 left join current_cases c on c.k=keys.k
 left join linked_history h on h.case_key=keys.k
 left join public.otc_return_audit_reviews r on r.case_key=keys.k
 order by (c.k is not null) desc,
          coalesce(r.reviewed_at, 'epoch'::timestamptz) desc,keys.k;
end;
$$;
revoke all on function public.analytics_returns_cohort_order_cases_v1(bigint,bigint)
 from public,anon,authenticated;
grant execute on function public.analytics_returns_cohort_order_cases_v1(bigint,bigint)
 to authenticated;

-- Atomically call existing versioned review workflow and persist order link.
-- No manual Odoo/snapshot correction is made.
create or replace function public.review_returns_cohort_order_case_v1(
 p_company_id bigint,p_order_id bigint,p_case_key text,
 p_expected_version integer,p_status text,p_note text)
returns table(case_key text,status text,version integer,reviewed_at timestamptz)
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth
as $$
declare v_line bigint;v_product bigint;v_result record;
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated' then
  raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.app_user_roles r where
   r.user_id=auth.uid() and r.is_active and r.role in('manager','admin')) then
  raise exception 'RETURNS_REVIEW_MANAGER_REQUIRED' using errcode='42501';end if;
 if p_company_id is null or p_order_id is null
   or p_company_id not in(select public.authorized_company_ids()) then
  raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';end if;
 if p_case_key is null or p_case_key !~ '^[a-f0-9]{32}$' then
  raise exception 'INVALID_CASE_KEY';end if;
 select a.sale_order_line_id,a.product_id into v_line,v_product
 from public.otc_return_audit_candidates_v1 a
 where a.company_id=p_company_id and a.sale_order_line_id is not null
   and public.otc_return_audit_case_key(a.rule_code,a.company_id,
        a.sale_order_line_id,a.product_id,a.return_move_ids)=p_case_key
   and exists(select 1 from public.otc_sale_line_reconciliation_canonical_v1 l
     where l.company_id=p_company_id and l.order_id=p_order_id
       and l.sale_order_line_id=a.sale_order_line_id
       and l.product_id=a.product_id)
 limit 1;
 if not found then raise exception 'CASE_NOT_LINKED_TO_ORDER' using errcode='42501';end if;
 select * into v_result from public.review_return_audit_candidate_v1(
  p_case_key,p_expected_version,p_status,p_note);
 -- Reject conflicting historic mapping instead of silently reassociating.
 insert into public.otc_return_audit_case_order_links
  (case_key,company_id,order_id,sale_order_line_id,product_id,linked_by)
 values(p_case_key,p_company_id,p_order_id,v_line,v_product,auth.uid())
 on conflict(case_key) do nothing;
 if not exists(select 1 from public.otc_return_audit_case_order_links m
    where m.case_key=p_case_key and m.company_id=p_company_id and m.order_id=p_order_id
      and m.sale_order_line_id=v_line and m.product_id=v_product) then
  raise exception 'CASE_ORDER_MAPPING_CONFLICT';end if;
 return query select v_result.case_key,v_result.status,v_result.version,v_result.reviewed_at;
end;
$$;
revoke all on function public.review_returns_cohort_order_case_v1(bigint,bigint,text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.review_returns_cohort_order_case_v1(bigint,bigint,text,integer,text,text)
 to authenticated;
commit;
