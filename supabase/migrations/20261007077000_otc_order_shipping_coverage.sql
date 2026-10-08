-- Auditable order shipping coverage; do not report customer fallback as verified delivery geography.
begin;
create or replace view public.otc_order_shipping_coverage_v1
with (security_invoker=true)
as
with orders as (
  select distinct company_id,order_id,customer_id
  from public.product_sales_from_june1
  where company_id in (1,2) and order_id is not null
), classified as (
  select o.company_id,o.order_id,
    case
      when sh.delivery_partner_id is null then 'shipping_not_synced'
      when ad.area_code is not null then 'delivery_area_verified_by_keyword'
      when ad.governorate_code is not null then 'delivery_governorate_only'
      when cg.area_code is not null or cg.governorate_code is not null then 'customer_geography_fallback'
      else 'unmapped'
    end as coverage_status
  from orders o
  left join public.otc_order_shipping_dimension sh
    on sh.company_id=o.company_id and sh.order_id=o.order_id
  left join public.customer_delivery_address_dimension ad
    on ad.company_id=sh.company_id and ad.delivery_partner_id=sh.delivery_partner_id
  left join public.customer_geography_dimension cg
    on cg.company_id=o.company_id and cg.customer_id=o.customer_id
)
select company_id,coverage_status,count(*)::bigint as orders_count
from classified
group by company_id,coverage_status;

revoke all on public.otc_order_shipping_coverage_v1 from public,anon,authenticated;
grant select on public.otc_order_shipping_coverage_v1 to service_role;
commit;
