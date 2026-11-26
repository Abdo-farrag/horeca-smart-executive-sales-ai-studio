-- Post-merge release preflight, read-only, no DDL/DML.
-- Inspect the chosen environment before staging migration/deploy.
-- Company IDs are source-specific and must be independently confirmed.
begin transaction read only;

select current_database() as db_name,
       current_timestamp as inspected_at,
       to_regclass('public.otc_delivery_lines') is not null as delivery_snapshot_exists,
       to_regclass('public.otc_return_lines') is not null as return_snapshot_exists,
       to_regclass('public.otc_return_audit_reviews') is not null as audit_review_table_exists,
       to_regclass('public.otc_return_audit_review_events') is not null as audit_events_table_exists,
       to_regclass('public.otc_move_uom_evidence') is not null as uom_evidence_table_exists,
       to_regclass('public.otc_return_evidence_status_v1') is not null as evidence_coverage_view_exists,
       to_regprocedure('public.analytics_return_audit_review_queue_v1(bigint,text,integer,integer)') is not null as review_queue_rpc_exists,
       to_regprocedure('public.analytics_return_audit_history_v1(bigint,text,integer,integer)') is not null as review_history_rpc_exists,
       to_regprocedure('public.analytics_otc_return_evidence_coverage_v1(bigint)') is not null as coverage_rpc_exists;

-- Security posture of existing source snapshots and new audit tables (if deployed).
select n.nspname as schema_name,c.relname as object_name,
       c.relkind,c.relrowsecurity as rls_enabled,
       has_table_privilege('anon',c.oid,'SELECT') as anon_can_select,
       has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_can_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
 and c.relname in (
 'otc_delivery_lines','otc_return_lines','otc_return_audit_reviews',
 'otc_return_audit_review_events','otc_move_uom_evidence',
 'otc_return_audit_candidates_v1','otc_return_evidence_status_v1')
order by c.relname;

-- Aggregate role inventory only: no staff IDs, tokens or private profile fields.
select role,is_active,coalesce(company_id,-1) as company_id,
       count(*) as staff_count
from public.app_user_roles group by role,is_active,coalesce(company_id,-1)
order by role,is_active,company_id;

select 'delivery' as event_type,company_id,
       count(*) as stored_move_ids,
       min(delivery_date) as oldest_event,
       max(delivery_date) as newest_event,
       max(synced_at) as newest_snapshot_sync,
       count(*) filter(where link_confidence='direct') as direct_order_line_links
from public.otc_delivery_lines group by company_id
union all
select 'return',company_id,count(*),min(return_receipt_date),
       max(return_receipt_date),max(synced_at),
       count(*) filter(where link_confidence='direct')
from public.otc_return_lines group by company_id
order by event_type,company_id;

with d as (
 select company_id,count(*) as delivered
 from public.otc_delivery_lines
 where delivery_date >= '2026-11-01'::timestamptz group by company_id
),r as (
 select r.company_id,count(*) as returned,
       count(*) filter(where r.link_confidence<>'direct' or r.sale_order_line_id is null)
          as unverified_sale_line_links,
       count(*) filter(where r.origin_returned_move_id is null) as missing_origin_id,
       count(*) filter(where r.origin_returned_move_id is not null
           and not exists (select 1 from public.otc_delivery_lines d
             where d.company_id=r.company_id and d.odoo_move_id=r.origin_returned_move_id))
          as original_delivery_absent_in_snapshot
 from public.otc_return_lines r
 where r.return_receipt_date >= '2026-11-01'::timestamptz
 group by r.company_id
)
select coalesce(d.company_id,r.company_id) as company_id,
       d.delivered,r.returned,r.unverified_sale_line_links,
       r.missing_origin_id,r.original_delivery_absent_in_snapshot
from d full join r using(company_id) order by company_id;

-- Numeric excess is explicitly PROVISIONAL until UoM consistency is proven.
with d as (
 select company_id,sale_order_line_id,product_id,sum(delivered_qty) as delivered_qty
 from public.otc_delivery_lines
 where link_confidence='direct' and sale_order_line_id is not null
 group by 1,2,3
),r as (
 select company_id,sale_order_line_id,product_id,sum(returned_qty) as returned_qty
 from public.otc_return_lines
 where link_confidence='direct' and sale_order_line_id is not null
 group by 1,2,3
)
select r.company_id,
       count(*) filter(where d.sale_order_line_id is null)
          as missing_direct_delivery_group_count,
       count(*) filter(where d.sale_order_line_id is not null
                and r.returned_qty>d.delivered_qty)
          as unverified_numeric_excess_group_count
from r left join d using(company_id,sale_order_line_id,product_id)
group by r.company_id order by r.company_id;

commit;
