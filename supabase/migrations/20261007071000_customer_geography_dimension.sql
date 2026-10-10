-- Customer Geography Dimension
-- Materializes expensive address/keyword classification once per customer/company.
begin;

create table if not exists public.customer_geography_dimension (
  customer_id bigint not null,
  company_id bigint not null,
  customer_name text,
  governorate_code text,
  governorate_name_ar text,
  area_code text,
  area_name_ar text,
  geography_source text,
  geography_confidence numeric(5,2),
  needs_review boolean not null default false,
  source_customer_write_date timestamptz,
  refreshed_at timestamptz not null default now(),
  primary key (customer_id, company_id)
);

create index if not exists idx_customer_geo_dim_governorate
  on public.customer_geography_dimension (governorate_code);
create index if not exists idx_customer_geo_dim_area
  on public.customer_geography_dimension (area_code);
create index if not exists idx_customer_geo_dim_review
  on public.customer_geography_dimension (needs_review)
  where needs_review = true;

insert into public.customer_geography_dimension (
  customer_id, company_id, customer_name,
  governorate_code, governorate_name_ar, area_code, area_name_ar,
  geography_source, geography_confidence, needs_review,
  source_customer_write_date, refreshed_at
)
select
  g.customer_id, g.scoped_company_id, g.customer_name,
  g.governorate_code, g.governorate_name_ar, g.area_code, g.area_name_ar,
  g.geography_source, g.geography_confidence, g.needs_review,
  c.write_date, now()
from (
  select geo.*, scope.company_id as scoped_company_id
  from public.customer_geography_odoo18 geo
  cross join (values (1::bigint),(2::bigint)) as scope(company_id)
  where geo.company_id is null or geo.company_id=scope.company_id
) g
left join public.customer_master_odoo18 c
  on c.customer_id = g.customer_id and c.company_id is not distinct from g.company_id
on conflict (customer_id, company_id) do update set
  customer_name = excluded.customer_name,
  governorate_code = excluded.governorate_code,
  governorate_name_ar = excluded.governorate_name_ar,
  area_code = excluded.area_code,
  area_name_ar = excluded.area_name_ar,
  geography_source = excluded.geography_source,
  geography_confidence = excluded.geography_confidence,
  needs_review = excluded.needs_review,
  source_customer_write_date = excluded.source_customer_write_date,
  refreshed_at = excluded.refreshed_at;

delete from public.customer_geography_dimension d
where not exists (
  select 1 from public.customer_geography_odoo18 g
  where g.customer_id=d.customer_id and (g.company_id=d.company_id or g.company_id is null)
);

alter table public.customer_geography_dimension enable row level security;
revoke all on table public.customer_geography_dimension from public, anon, authenticated;
grant select, insert, update, delete on table public.customer_geography_dimension to service_role;

analyze public.customer_geography_dimension;
commit;
