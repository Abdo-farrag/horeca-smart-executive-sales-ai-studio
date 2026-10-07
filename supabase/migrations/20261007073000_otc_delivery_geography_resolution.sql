-- OTC geography resolution: delivery address first, customer geography only as fallback.
-- Keeps geography at address/customer grain instead of recalculating keyword matching per sales line.
begin;

create or replace view public.otc_delivery_geography_v1
with (security_invoker = true)
as
select
  d.odoo_move_id,
  d.sale_order_line_id,
  d.company_id,
  d.customer_id,
  d.delivery_partner_id,
  coalesce(a.governorate_code, c.governorate_code) as governorate_code,
  coalesce(a.governorate_name_ar, c.governorate_name_ar) as governorate_name_ar,
  coalesce(a.area_code, c.area_code) as area_code,
  coalesce(a.area_name_ar, c.area_name_ar) as area_name_ar,
  case
    when a.area_code is not null or a.governorate_code is not null then 'delivery_address'
    when c.area_code is not null or c.governorate_code is not null then 'customer_fallback'
    else 'unmapped'
  end as geography_resolution_source
from public.otc_delivery_lines d
left join public.customer_delivery_address_dimension a
  on a.company_id=d.company_id and a.delivery_partner_id=d.delivery_partner_id
left join public.customer_geography_dimension c
  on c.company_id=d.company_id and c.customer_id=d.customer_id;

create or replace view public.otc_return_geography_v1
with (security_invoker = true)
as
select
  r.odoo_return_move_id,
  r.sale_order_line_id,
  r.company_id,
  r.customer_id,
  r.delivery_partner_id,
  coalesce(a.governorate_code, c.governorate_code) as governorate_code,
  coalesce(a.governorate_name_ar, c.governorate_name_ar) as governorate_name_ar,
  coalesce(a.area_code, c.area_code) as area_code,
  coalesce(a.area_name_ar, c.area_name_ar) as area_name_ar,
  case
    when a.area_code is not null or a.governorate_code is not null then 'delivery_address'
    when c.area_code is not null or c.governorate_code is not null then 'customer_fallback'
    else 'unmapped'
  end as geography_resolution_source
from public.otc_return_lines r
left join public.customer_delivery_address_dimension a
  on a.company_id=r.company_id and a.delivery_partner_id=r.delivery_partner_id
left join public.customer_geography_dimension c
  on c.company_id=r.company_id and c.customer_id=r.customer_id;

revoke all on table public.otc_delivery_geography_v1 from public,anon,authenticated;
revoke all on table public.otc_return_geography_v1 from public,anon,authenticated;
grant select on table public.otc_delivery_geography_v1 to service_role;
grant select on table public.otc_return_geography_v1 to service_role;

commit;
