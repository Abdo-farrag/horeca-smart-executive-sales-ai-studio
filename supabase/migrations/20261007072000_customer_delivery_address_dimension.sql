-- Delivery geography foundation: a customer may have multiple delivery addresses.
-- Customer geography remains a fallback; operational geography belongs to Odoo delivery partner/picking.
begin;

create table if not exists public.customer_delivery_address_dimension (
  company_id bigint not null,
  customer_id bigint,
  delivery_partner_id bigint not null,
  delivery_partner_name text,
  street text,
  street2 text,
  city text,
  state_id bigint,
  state_name text,
  governorate_code text,
  governorate_name_ar text,
  area_code text,
  area_name_ar text,
  geography_source text,
  geography_confidence numeric(5,2),
  needs_review boolean not null default false,
  source_updated_at timestamptz,
  refreshed_at timestamptz not null default now(),
  primary key (company_id, delivery_partner_id)
);

create index if not exists idx_delivery_geo_customer
  on public.customer_delivery_address_dimension (company_id, customer_id);
create index if not exists idx_delivery_geo_area
  on public.customer_delivery_address_dimension (area_code);
create index if not exists idx_delivery_geo_governorate
  on public.customer_delivery_address_dimension (governorate_code);

alter table public.otc_delivery_lines
  add column if not exists delivery_partner_id bigint;
alter table public.otc_return_lines
  add column if not exists delivery_partner_id bigint;

create index if not exists idx_otc_delivery_delivery_partner
  on public.otc_delivery_lines (company_id, delivery_partner_id)
  where delivery_partner_id is not null;
create index if not exists idx_otc_return_delivery_partner
  on public.otc_return_lines (company_id, delivery_partner_id)
  where delivery_partner_id is not null;

alter table public.customer_delivery_address_dimension enable row level security;
revoke all on table public.customer_delivery_address_dimension from public, anon, authenticated;
grant select,insert,update,delete on table public.customer_delivery_address_dimension to service_role;

commit;
