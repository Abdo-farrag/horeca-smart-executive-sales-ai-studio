-- Refresh customer fallback geography at customer grain, not per order line.
begin;
create or replace function public.refresh_customer_geography_dimension_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_count bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'SYNC_FORBIDDEN' using errcode='42501';
  end if;
  insert into public.customer_geography_dimension (
    customer_id,company_id,customer_name,governorate_code,governorate_name_ar,
    area_code,area_name_ar,geography_source,geography_confidence,needs_review,
    source_customer_write_date,refreshed_at
  )
  select g.customer_id,g.scoped_company_id,g.customer_name,g.governorate_code,g.governorate_name_ar,
         g.area_code,g.area_name_ar,g.geography_source,g.geography_confidence,g.needs_review,
         c.write_date,now()
  from (
    select geo.*, scope.company_id as scoped_company_id
    from public.customer_geography_odoo18 geo
    cross join (values (1::bigint),(2::bigint)) as scope(company_id)
    where geo.company_id is null or geo.company_id=scope.company_id
  ) g
  left join public.customer_master_odoo18 c
    on c.customer_id=g.customer_id and c.company_id is not distinct from g.company_id
  on conflict (customer_id,company_id) do update set
    customer_name=excluded.customer_name,
    governorate_code=excluded.governorate_code,
    governorate_name_ar=excluded.governorate_name_ar,
    area_code=excluded.area_code,
    area_name_ar=excluded.area_name_ar,
    geography_source=excluded.geography_source,
    geography_confidence=excluded.geography_confidence,
    needs_review=excluded.needs_review,
    source_customer_write_date=excluded.source_customer_write_date,
    refreshed_at=excluded.refreshed_at;
  get diagnostics v_count=row_count;
  return jsonb_build_object('customers_refreshed',v_count);
end;
$$;
revoke all on function public.refresh_customer_geography_dimension_v1() from public,anon,authenticated;
grant execute on function public.refresh_customer_geography_dimension_v1() to service_role;
commit;
