-- Assertions execute only in the ephemeral GitHub Actions PostgreSQL service.
-- Fail CI on any mismatch; no production connection.
do $$
begin
  if (select count(*) from public.customer_geography_dimension) <> 3 then
    raise exception 'customer geography company-null expansion failed';
  end if;
  if (select count(*) from public.customer_geography_dimension
      where customer_id=101 and company_id in (1,2)) <> 2 then
    raise exception 'company-null customer not scoped to both companies';
  end if;
  if (select count(*) from public.customer_geography_dimension) <>
     (select count(distinct (customer_id,company_id)) from public.customer_geography_dimension) then
    raise exception 'duplicate customer geography keys';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.customer_geography_dimension'::regclass) then
    raise exception 'customer geography RLS disabled';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.customer_delivery_address_dimension'::regclass) then
    raise exception 'delivery address RLS disabled';
  end if;
  if has_table_privilege('authenticated','public.customer_delivery_address_dimension','SELECT') then
    raise exception 'authenticated role can read delivery address table';
  end if;
  if has_table_privilege('anon','public.otc_order_shipping_dimension','SELECT') then
    raise exception 'anon role can read shipping table';
  end if;
end $$;

insert into public.customer_delivery_address_dimension
(company_id,customer_id,delivery_partner_id,delivery_partner_name,street,city,state_name,geography_source,needs_review)
values
(1,null,201,'Shared delivery','Nasr City','Cairo','Cairo','odoo_delivery_partner',true),
(1,101,202,'Second delivery','Maadi','Cairo','Cairo','odoo_delivery_partner',true),
(2,101,201,'Same partner id other company','Maadi','Cairo','Cairo','odoo_delivery_partner',true);
insert into public.otc_order_shipping_dimension (company_id,order_id,customer_id,delivery_partner_id)
values (1,1001,101,201),(1,1002,101,202),(1,1003,102,201),(2,2001,101,201);
update public.otc_delivery_lines set delivery_partner_id=201 where odoo_move_id in (3001,3003);
update public.otc_delivery_lines set delivery_partner_id=202 where odoo_move_id=3002;
update public.otc_return_lines set delivery_partner_id=201,return_partner_id=202 where odoo_return_move_id=4001;

-- Missing JWT role must not bypass SECURITY DEFINER guards.
select set_config('request.jwt.claim.role','',false);
do $$
declare blocked boolean:=false;
begin
  begin
    perform public.refresh_customer_delivery_geography_v1();
  exception when sqlstate '42501' then blocked:=true;
  end;
  if not blocked then raise exception 'unauthenticated delivery refresh succeeded'; end if;
  blocked:=false;
  begin
    perform public.refresh_customer_geography_dimension_v1();
  exception when sqlstate '42501' then blocked:=true;
  end;
  if not blocked then raise exception 'unauthenticated customer refresh succeeded'; end if;
end $$;
select set_config('request.jwt.claim.role','service_role',false);
select public.refresh_customer_delivery_geography_v1();
select public.refresh_customer_geography_dimension_v1();

do $$
declare
  r record;
begin
  select * into r from public.otc_sale_line_reconciliation_v1 where sale_order_line_id=1101;
  if r.governorate_code is distinct from 'CAIRO' or r.area_code is distinct from 'NASR' then
    raise exception 'order 1001 did not use actual shipping area: % %',r.governorate_code,r.area_code;
  end if;
  if r.net_delivered_qty <> 8 or r.net_delivered_value <> 80
     or r.net_invoiced_qty <> 8 or r.net_invoiced_value <> 80 then
    raise exception 'net realized order line mismatch';
  end if;
  select * into r from public.otc_sale_line_reconciliation_v1 where sale_order_line_id=1102;
  if r.area_code is distinct from 'MAADI' then
    raise exception 'second shipping address not respected';
  end if;
  select * into r from public.otc_sale_line_reconciliation_v1 where sale_order_line_id=2101;
  if r.area_code is distinct from 'MAADI' then
    raise exception 'same partner ID leaked across company boundary';
  end if;
  if (select count(*) from public.otc_sale_line_reconciliation_v1) <> 4 then
    raise exception 'reconciliation fanout/row loss';
  end if;
  select * into r from public.otc_return_geography_v1 where odoo_return_move_id=4001;
  if r.area_code is distinct from 'NASR' then
    raise exception 'return did not inherit original outbound delivery area';
  end if;
  if (select return_partner_id from public.otc_return_lines where odoo_return_move_id=4001) <> 202 then
    raise exception 'return pickup partner was lost';
  end if;
  if (select count(*) from public.otc_order_shipping_coverage_v1 where coverage_status='delivery_area_keyword_match') <> 2 then
    raise exception 'shipping coverage company counts incorrect';
  end if;
  if (select sum(orders_count) from public.otc_order_shipping_coverage_v1) <> 4 then
    raise exception 'shipping coverage double-counted orders';
  end if;
end $$;

-- Check RPC execution with a synthetic authenticated session.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
select date_basis,ordered_value,net_delivered_value,net_invoiced_value
from public.analytics_order_to_cash_kpis_v1('2026-10-01','2026-10-31','MAS');
select period_start,ordered_value,net_delivered_value
from public.analytics_order_to_cash_trend_v1('2026-10-01','2026-10-31','order',null,null,null,null,null,null,null,null,'day');

select 'OTC_POSTGRES_ASSERTIONS_PASSED' as result;
