-- Classify each distinct delivery address once (not per order or sales line).
-- Restricted to service_role; call after address upserts in the Odoo sync.
begin;
create or replace function public.refresh_customer_delivery_geography_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_matched bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SYNC_FORBIDDEN' using errcode='42501';
  end if;
  with address_text as (
    select d.company_id,d.delivery_partner_id,
      lower(concat_ws(' ',d.street,d.street2,d.city,d.state_name)) as geo_text
    from public.customer_delivery_address_dimension d
  ), matches as (
    select t.company_id,t.delivery_partner_id,a.area_code,a.area_name_ar,
           a.governorate_code,a.governorate_name_ar,
           sum(k.weight) as score,max(k.weight) as max_weight,count(*) as keyword_count,
           a.priority
    from address_text t
    join public.geography_area_keywords k
      on k.is_active and length(trim(k.keyword_normalized))>=3
     and t.geo_text like '%' || lower(k.keyword_normalized) || '%'
    join public.geography_area_master a
      on a.area_code=k.area_code and a.is_active
    group by t.company_id,t.delivery_partner_id,a.area_code,a.area_name_ar,
             a.governorate_code,a.governorate_name_ar,a.priority
  ), ranked as (
    select m.*,row_number() over(
      partition by m.company_id,m.delivery_partner_id
      order by m.score desc,m.max_weight desc,m.keyword_count desc,m.priority,m.area_code
    ) as rn,
    lead(m.score) over(
      partition by m.company_id,m.delivery_partner_id
      order by m.score desc,m.max_weight desc,m.keyword_count desc,m.priority,m.area_code
    ) as runner_up_score
    from matches m
  )
  update public.customer_delivery_address_dimension d set
    area_code=r.area_code,area_name_ar=r.area_name_ar,
    governorate_code=r.governorate_code,governorate_name_ar=r.governorate_name_ar,
    geography_source='delivery_address_keyword_match',
    geography_confidence=case
      when r.runner_up_score=r.score then 0.40
      when r.keyword_count>=2 then 0.85
      else 0.60
    end,
    needs_review=(r.runner_up_score=r.score or r.keyword_count<2),
    refreshed_at=now()
  from ranked r
  where r.rn=1 and d.company_id=r.company_id
    and d.delivery_partner_id=r.delivery_partner_id;
  get diagnostics v_matched=row_count;
  return jsonb_build_object('addresses_classified',v_matched);
end;
$$;
revoke all on function public.refresh_customer_delivery_geography_v1() from public,anon,authenticated;
grant execute on function public.refresh_customer_delivery_geography_v1() to service_role;
commit;
