-- P1 Access Control: normalize stable salesperson identity for order analytics.
-- Security contract: salesperson_id bigint is the authorization join key; salesperson text is display-only.
-- REVIEW GATE: this migration is committed for review and is not applied by repository CI.
--
-- Read-only production QA on 2026-09-03 showed:
--   * sales_orders_odoo18: 4,450 orders
--   * customer_product_history order-id mapping: 3,970 orders with a salesperson ID, 0 conflicting order IDs
--   * 476 of 480 remaining orders recover through a UNIQUE master name -> ID dictionary
--   * 4 orders remain unresolved and therefore fail closed for rep/team-scoped analytics
-- The name dictionary below is normalization only. Runtime authorization never compares a trusted user scope to salesperson text.

begin;

create or replace view public.sales_orders_odoo18_secure
with (security_invoker = false)
as
with order_identity as (
  select
    h.order_id,
    count(distinct h.salesperson_id) filter (where h.salesperson_id is not null) as id_count,
    max(h.salesperson_id)::bigint as salesperson_id
  from public.customer_product_history h
  group by h.order_id
),
master_identity_raw as (
  select salesperson_id, salesperson from public.customer_master_odoo18
  union all
  select salesperson_id, salesperson from public.raw_customers_odoo18
  union all
  select salesperson_id, salesperson from public.raw_customers
),
master_identity as (
  select
    lower(btrim(salesperson)) as salesperson_key,
    count(distinct salesperson_id) filter (where salesperson_id is not null) as id_count,
    max(salesperson_id)::bigint as salesperson_id
  from master_identity_raw
  where salesperson is not null
    and btrim(salesperson) <> ''
  group by lower(btrim(salesperson))
)
select
  s.order_id,
  s.order_name,
  s.order_date,
  s.order_date_cairo,
  s.order_month,
  s.company_id,
  s.company_name,
  s.customer_id,
  s.customer_name,
  s.salesperson,
  case
    when oi.id_count = 1 then oi.salesperson_id
    when oi.salesperson_id is null and mi.id_count = 1 then mi.salesperson_id
    else null
  end::bigint as salesperson_id,
  case
    when oi.id_count = 1 then 'ORDER_HISTORY_ID'
    when oi.salesperson_id is null and mi.id_count = 1 then 'UNIQUE_MASTER_NAME_NORMALIZATION'
    when coalesce(oi.id_count, 0) > 1 then 'CONFLICTING_ORDER_IDS'
    else 'UNRESOLVED'
  end::text as identity_source,
  s.warehouse_id,
  s.warehouse_name,
  s.lines_count,
  s.products_count,
  s.total_qty,
  s.order_value,
  s.source_updated_at
from public.sales_orders_odoo18 s
left join order_identity oi
  on oi.order_id = s.order_id
left join master_identity mi
  on mi.salesperson_key = lower(btrim(s.salesperson));

comment on view public.sales_orders_odoo18_secure is
  'P1 secure order analytics source. salesperson_id is normalized once from stable data and is the only salesperson authorization key. Text salesperson is display-only.';

revoke all on table public.sales_orders_odoo18_secure from anon;
revoke all on table public.sales_orders_odoo18_secure from authenticated;

commit;
