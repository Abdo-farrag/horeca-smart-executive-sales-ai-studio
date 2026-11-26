-- PROPOSAL / NOT DEPLOYED. Review against an isolated database and real signed-in JWTs.
-- All metrics are grouped by original order date (Africa/Cairo), not return event date.
-- Requires explicit Production RLS authorization before deployment.
begin;

create or replace function public.analytics_returns_cohort_dashboard_v1(
 p_start_date date,p_end_date date,p_company_id bigint default null,
 p_search text default null,p_status text default 'all',
 p_limit integer default 40,p_offset integer default 0
) returns table(payload jsonb)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth
as $$
declare
 v_allowed bigint[];
begin
 if auth.uid() is null or coalesce(current_setting('request.jwt.claim.role',true),'')<>'authenticated' then
  raise exception 'AUTH_REQUIRED' using errcode='42501';
 end if;
 if not exists(select 1 from public.app_user_roles r
   where r.user_id=auth.uid() and r.is_active and r.role in ('manager','admin')) then
  raise exception 'RETURNS_REVIEW_MANAGER_REQUIRED' using errcode='42501';
 end if;
 select array_agg(x) into v_allowed from public.authorized_company_ids() x;
 if coalesce(array_length(v_allowed,1),0)=0 or
    (p_company_id is not null and not p_company_id=any(v_allowed)) then
  raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';
 end if;
 if p_start_date is null or p_end_date is null or p_start_date>p_end_date or
    p_end_date-p_start_date>365 then raise exception 'INVALID_COHORT_PERIOD';end if;
 if p_limit is null or p_limit<1 or p_limit>40 or
    p_offset is null or p_offset<0 or p_offset>10000 then
  raise exception 'INVALID_PAGINATION';end if;
 if p_status not in ('all','returned','flagged') then raise exception 'INVALID_STATUS';end if;
 if length(coalesce(p_search,''))>120 then raise exception 'INVALID_SEARCH';end if;

 return query
 with lines as materialized (
  select v.* from public.otc_sale_line_reconciliation_canonical_v1 v
  where (v.order_date at time zone 'Africa/Cairo')::date between p_start_date and p_end_date
    and v.company_id=any(v_allowed)
    and (p_company_id is null or v.company_id=p_company_id)
    and v.order_id is not null
 ),
 return_stats as materialized (
  select r.company_id,r.sale_order_line_id,
    count(distinct r.odoo_return_move_id)::integer return_events,
    max(r.return_receipt_date) last_return_at,
    bool_or(r.origin_returned_move_id is null or
      d.odoo_move_id is null) as missing_original,
    bool_or(r.link_confidence is distinct from 'direct') as uncertain_link
  from public.otc_return_lines r
  join (select distinct company_id,sale_order_line_id from lines) l
   on l.company_id=r.company_id and l.sale_order_line_id=r.sale_order_line_id
  left join public.otc_delivery_lines d
   on d.company_id=r.company_id and d.odoo_move_id=r.origin_returned_move_id
  where r.company_id=any(v_allowed)
  group by r.company_id,r.sale_order_line_id
 ),
 duplicated_returns as materialized (
  select distinct a.company_id,a.sale_order_line_id
  from public.otc_return_lines a
  join public.otc_return_lines b
   on a.company_id=b.company_id
   and a.sale_order_line_id=b.sale_order_line_id
   and a.product_id=b.product_id
   and a.odoo_return_move_id<b.odoo_return_move_id
   and a.returned_qty=b.returned_qty
   and abs(extract(epoch from (a.return_receipt_date-b.return_receipt_date)))<=86400
  join (select distinct company_id,sale_order_line_id from lines) l
   on l.company_id=a.company_id and l.sale_order_line_id=a.sale_order_line_id
  where a.company_id=any(v_allowed)
 ),
 per_order as materialized (
  select l.company_id,l.order_id,
   max(l.order_name) order_name,max(l.customer_id) customer_id,
   max(l.customer_name) customer_name,max(l.salesperson_name) salesperson_name,
   min(l.order_date) order_date,
   count(distinct l.sale_order_line_id)::integer line_count,
   coalesce(sum(l.ordered_value),0)::numeric ordered_value,
   coalesce(sum(l.gross_delivered_value),0)::numeric delivered_value,
   coalesce(sum(l.returned_value),0)::numeric returned_value,
   coalesce(sum(l.credit_note_value),0)::numeric credited_value,
   coalesce(sum(rs.return_events),0)::integer return_events,
   max(rs.last_return_at) last_return_at,
   bool_or(coalesce(rs.missing_original,false)) missing_original,
   bool_or(coalesce(rs.uncertain_link,false) or
    coalesce(l.inferred_return_events,0)>0) uncertain_link,
   bool_or(dr.sale_order_line_id is not null) duplicate_candidate,
   bool_or(l.returned_qty>l.gross_delivered_qty
     and coalesce(l.returned_qty,0)>0) provisional_excess,
   bool_or(l.returned_value>l.credit_note_value
     and l.returned_value>0) provisional_credit_gap
  from lines l
  left join return_stats rs on rs.company_id=l.company_id and rs.sale_order_line_id=l.sale_order_line_id
  left join duplicated_returns dr on dr.company_id=l.company_id and dr.sale_order_line_id=l.sale_order_line_id
  group by l.company_id,l.order_id
 ),
 enriched as materialized (
  select o.*,
   array_remove(array[
    case when o.missing_original then 'MISSING_ORIGINAL_DELIVERY' end,
    case when o.uncertain_link then 'UNVERIFIED_LINK' end,
    case when o.duplicate_candidate then 'POSSIBLE_DUPLICATE_RETURN' end,
    case when o.provisional_excess then 'EXCESS_RETURN_UOM_UNVERIFIED' end,
    case when o.provisional_credit_gap then 'CREDIT_NOTE_PENDING' end
   ]::text[],null::text) review_flags
  from per_order o
 ),
 filtered as materialized (
  select * from enriched e where
   (nullif(btrim(p_search),'') is null
    or e.order_name ilike '%'||btrim(p_search)||'%'
    or e.customer_name ilike '%'||btrim(p_search)||'%')
   and (p_status='all'
    or (p_status='returned' and e.return_events>0)
    or (p_status='flagged' and array_length(e.review_flags,1)>0))
 ),
 summary as (
  select count(*)::integer order_count,
   count(*) filter(where return_events>0)::integer orders_with_returns,
   coalesce(sum(ordered_value),0)::numeric ordered_value,
   coalesce(sum(delivered_value),0)::numeric delivered_value,
   coalesce(sum(delivered_value-returned_value),0)::numeric net_delivered_value,
   coalesce(sum(credited_value),0)::numeric credited_value,
   coalesce(sum(returned_value),0)::numeric returned_value,
   count(*) filter(where array_length(review_flags,1)>0)::integer flagged_orders
  from filtered
 ),
 page as (
  select * from filtered
  order by coalesce(array_length(review_flags,1),0) desc,
   returned_value desc,company_id,order_id
  limit p_limit offset p_offset
 )
 select jsonb_build_object(
  'total_rows',(select count(*) from filtered),
  'summary',(select jsonb_build_object(
    'order_count',order_count,'orders_with_returns',orders_with_returns,
    'ordered_value',ordered_value,
    'delivered_value',delivered_value,'net_delivered_value',net_delivered_value,
    'credited_value',credited_value,'returned_value',returned_value,
    'return_order_rate_pct',case when order_count>0
     then round(orders_with_returns::numeric*100/order_count,2) else null end,
    -- Value-base equivalence and UoM are not verified yet:
    'return_value_rate_pct',null,
    'flagged_orders',flagged_orders,
    -- Unlinked movements cannot be assigned to the original order cohort:
    'unlinked_return_moves',null,
    'snapshot_through',(select max(t.synced_at) from public.otc_return_lines t
                        where t.company_id=any(v_allowed))
  ) from summary),
  'orders',coalesce((select jsonb_agg(jsonb_build_object(
    'company_id',o.company_id,'order_id',o.order_id,
    'order_name',o.order_name,'customer_id',o.customer_id,
    'customer_name',o.customer_name,'salesperson_name',o.salesperson_name,
    'order_date',o.order_date,
    'ordered_value',o.ordered_value,'delivered_value',o.delivered_value,
    'returned_value',o.returned_value,'credited_value',o.credited_value,
    'return_events',o.return_events,'last_return_at',o.last_return_at,
    'line_count',o.line_count,'review_flags',to_jsonb(o.review_flags),
    'review_status','not_available'
   ) order by coalesce(array_length(o.review_flags,1),0) desc,
     o.returned_value desc,o.company_id,o.order_id) from page o),'[]'::jsonb)
 );
end;
$$;

revoke all on function public.analytics_returns_cohort_dashboard_v1(date,date,bigint,text,text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.analytics_returns_cohort_dashboard_v1(date,date,bigint,text,text,integer,integer)
 to authenticated;

create or replace function public.analytics_returns_cohort_order_detail_v1(
 p_company_id bigint,p_order_id bigint
) returns table(payload jsonb)
language plpgsql stable security definer
set search_path = pg_catalog, public, auth
as $$
declare v_allowed bigint[];
begin
 if auth.uid() is null or coalesce(current_setting('request.jwt.claim.role',true),'')<>'authenticated' then
  raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.app_user_roles r where
  r.user_id=auth.uid() and r.is_active and r.role in ('manager','admin')) then
  raise exception 'RETURNS_REVIEW_MANAGER_REQUIRED' using errcode='42501';end if;
 select array_agg(x) into v_allowed from public.authorized_company_ids() x;
 if p_company_id is null or p_order_id is null or not p_company_id=any(v_allowed) then
  raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';end if;
 if not exists(select 1 from public.otc_sale_line_reconciliation_canonical_v1 v
     where v.company_id=p_company_id and v.order_id=p_order_id) then
   raise exception 'ORDER_NOT_FOUND_OR_UNAVAILABLE' using errcode='22023';
 end if;
 return query with selected_lines as materialized (
   select v.* from public.otc_sale_line_reconciliation_canonical_v1 v
   where v.company_id=p_company_id and v.order_id=p_order_id
   order by v.sale_order_line_id limit 501
 ), events as materialized (
   select r.* from public.otc_return_lines r
   join (select distinct sale_order_line_id from selected_lines) l
    on l.sale_order_line_id=r.sale_order_line_id
   where r.company_id=p_company_id
   order by r.return_receipt_date,r.odoo_return_move_id limit 1001
 )
 select jsonb_build_object(
  'company_id',p_company_id,'order_id',p_order_id,
  'order_name',(select max(l.order_name) from selected_lines l),
  'lines',coalesce((select jsonb_agg(jsonb_build_object(
   'sale_order_line_id',l.sale_order_line_id,'product_name',l.product_name,
   'ordered_qty',l.ordered_qty,'delivered_qty',l.gross_delivered_qty,
   'returned_qty',l.returned_qty,'ordered_value',l.ordered_value,
   'delivered_value',l.gross_delivered_value,'returned_value',l.returned_value,
   'invoice_value',l.gross_invoiced_value,'credit_note_value',l.credit_note_value,
   'link_evidence',case when l.inferred_return_events>0 then 'inferred' else 'source_snapshot' end,
   'uom_status','unverified'
  ) order by l.sale_order_line_id) from (select * from selected_lines limit 500) l),'[]'::jsonb),
  'returns',coalesce((select jsonb_agg(jsonb_build_object(
   'move_id',r.odoo_return_move_id,
   'original_move_id',r.origin_returned_move_id,
   'receipt_date',r.return_receipt_date,
   'quantity',r.returned_qty,
   'reason',r.return_reason,
   'link_confidence',r.link_confidence,'source_status',r.source_state
  ) order by r.return_receipt_date,r.odoo_return_move_id)
   from (select * from events limit 1000) r),'[]'::jsonb),
  'notes',jsonb_build_array(
   'Amounts are operational estimates pending accounting verification.',
   'Return quantities and UoM still require comparison with source Odoo.',
   case when (select count(*) from selected_lines)>500 or
        (select count(*) from events)>1000
    then 'INCOMPLETE_DETAIL_LIMIT_EXCEEDED' else 'No source-completeness certification' end
  )
 );
end;
$$;

revoke all on function public.analytics_returns_cohort_order_detail_v1(bigint,bigint)
 from public,anon,authenticated;
grant execute on function public.analytics_returns_cohort_order_detail_v1(bigint,bigint)
 to authenticated;
commit;
