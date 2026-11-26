-- Issue #13 P0 read-only candidates; NOT a fraud finding.
-- Existing OTC source quantities have no canonical UoM field, so excess-quantity
-- alerts are provisional until Odoo UoM equivalence is verified.
begin;
create or replace view public.otc_return_audit_candidates_v1
with (security_invoker=true) as
with deliveries as (
  select company_id, sale_order_line_id, product_id,
         sum(delivered_qty) as delivered_qty
  from public.otc_delivery_lines
  where sale_order_line_id is not null and link_confidence = 'direct'
  group by company_id,sale_order_line_id,product_id
), returns as (
  select company_id,sale_order_line_id,product_id,
         sum(returned_qty) as returned_qty,
         count(*) as movement_count,
         array_agg(odoo_return_move_id order by odoo_return_move_id) as return_move_ids
  from public.otc_return_lines
  where sale_order_line_id is not null and link_confidence='direct'
  group by company_id,sale_order_line_id,product_id
), excess as (
  select 'EXCESS_RETURN_CANDIDATE'::text as rule_code,
         r.company_id,r.sale_order_line_id,r.product_id,
         r.return_move_ids,
         d.delivered_qty,r.returned_qty,
         'review_uom_and_source_moves'::text as confidence,
         'Quantity comparison is provisional: source UoM equivalence not yet proven'::text as explanation
  from returns r
  join deliveries d using(company_id,sale_order_line_id,product_id)
  where r.returned_qty > d.delivered_qty
), duplicates as (
  select 'POSSIBLE_DUPLICATE_RETURN'::text as rule_code,
         a.company_id,a.sale_order_line_id,a.product_id,
         array[a.odoo_return_move_id,b.odoo_return_move_id]::bigint[] as return_move_ids,
         null::numeric as delivered_qty,
         (a.returned_qty+b.returned_qty)::numeric as returned_qty,
         'review_required'::text as confidence,
         'Same order line, product and quantity within 24 hours; distinct Odoo move IDs'::text as explanation
  from public.otc_return_lines a
  join public.otc_return_lines b
    on a.company_id=b.company_id
   and a.sale_order_line_id=b.sale_order_line_id
   and a.product_id=b.product_id
   and a.odoo_return_move_id < b.odoo_return_move_id
   and a.returned_qty=b.returned_qty
   and abs(extract(epoch from (a.return_receipt_date-b.return_receipt_date))) <= 86400
  where a.sale_order_line_id is not null
    and a.link_confidence='direct' and b.link_confidence='direct'
), unlinked as (
  select 'UNLINKED_RETURN'::text as rule_code,
         r.company_id,r.sale_order_line_id,r.product_id,
         array[r.odoo_return_move_id]::bigint[] as return_move_ids,
         null::numeric as delivered_qty,
         r.returned_qty,
         'link_unverified'::text as confidence,
         'No directly verified original order-line link'::text as explanation
  from public.otc_return_lines r
  where r.sale_order_line_id is null or r.link_confidence <> 'direct'
), missing_delivery as (
  select 'MISSING_DELIVERY_EVIDENCE'::text as rule_code,
         r.company_id,r.sale_order_line_id,r.product_id,
         r.return_move_ids,
         null::numeric as delivered_qty,r.returned_qty,
         'data_incomplete'::text as confidence,
         'Direct return link exists, but no directly linked delivery snapshot'::text as explanation
  from returns r
  left join deliveries d using(company_id,sale_order_line_id,product_id)
  where d.sale_order_line_id is null
)
select * from excess
union all select * from duplicates
union all select * from unlinked
union all select * from missing_delivery;

comment on view public.otc_return_audit_candidates_v1 is
'Issue 13 preliminary P0 review queue. No definitive fraud/error classification; no canonical UoM in OTC snapshots.';
revoke all on public.otc_return_audit_candidates_v1 from public,anon,authenticated;
grant select on public.otc_return_audit_candidates_v1 to service_role;
commit;
