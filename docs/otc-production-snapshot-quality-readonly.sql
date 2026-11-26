-- Pure SELECT-only diagnostic. Run against Odoo-backed Supabase snapshots.
-- NOTE: Rows are stock.moves, NOT sale orders, pickings or proven errors.
with all_moves as (
 select company_id,'delivery'::text kind,odoo_move_id move_id,
        sale_order_line_id,link_confidence,delivery_date event_date,synced_at
 from public.otc_delivery_lines
 union all
 select company_id,'return',odoo_return_move_id,
        sale_order_line_id,link_confidence,return_receipt_date,synced_at
 from public.otc_return_lines
), aggregate_movements as (
 select company_id,kind,count(*) rows_count,count(distinct move_id) unique_move_ids,
        count(*) filter(where move_id is null or move_id<=0) invalid_ids,
        count(*) filter(where sale_order_line_id is null or link_confidence is distinct from 'direct') unverified_sale_links,
        min(event_date)::date earliest_utc_event,max(event_date)::date latest_utc_event,max(synced_at) latest_sync
 from all_moves group by company_id,kind
), duplicate_moves as (
 select company_id,kind,count(*) duplicate_move_id_groups,coalesce(sum(n-1),0) repeated_rows
 from (select company_id,kind,move_id,count(*) n from all_moves group by 1,2,3 having count(*)>1) g
 group by company_id,kind
)
select a.*,coalesce(d.duplicate_move_id_groups,0) duplicate_move_id_groups,
       coalesce(d.repeated_rows,0) repeated_rows
from aggregate_movements a left join duplicate_moves d using(company_id,kind)
order by company_id,kind;

-- Original delivery might fall BEFORE the window being synced: absence is
-- not itself evidence of an error, double return or missing Odoo movement.
select r.company_id,
 count(*) total_returns,
 count(*) filter(where r.origin_returned_move_id is null) missing_original_id,
 count(*) filter(where r.origin_returned_move_id is not null and d.odoo_move_id is null) original_missing_in_snapshot,
 count(*) filter(where d.odoo_move_id is not null) original_present_in_snapshot,
 count(*) filter(where r.sale_order_line_id is null or r.link_confidence is distinct from 'direct') unverified_sale_links,
 count(*) filter(where d.odoo_move_id is null and r.origin_returned_move_id is not null
    and r.return_receipt_date::date >= date '2026-10-01') original_missing_returned_oct_onwards
from public.otc_return_lines r
left join public.otc_delivery_lines d
 on d.company_id=r.company_id and d.odoo_move_id=r.origin_returned_move_id
group by r.company_id order by r.company_id;

-- Security release gate: requires company-restrictive SELECT policy
-- in addition to broad legacy Customer 360 policy.
select tablename,policyname,permissive,roles,cmd,qual
from pg_policies where schemaname='public'
 and tablename in ('otc_delivery_lines','otc_return_lines','otc_invoice_lines')
order by tablename,policyname;
