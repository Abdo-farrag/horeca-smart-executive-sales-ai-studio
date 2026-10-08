-- Order-level Odoo shipping identity, distinct from commercial customer.
begin;
create table if not exists public.otc_order_shipping_dimension (
  company_id bigint not null,
  order_id bigint not null,
  customer_id bigint,
  delivery_partner_id bigint,
  source_updated_at timestamptz,
  refreshed_at timestamptz not null default now(),
  primary key (company_id, order_id)
);
create index if not exists idx_otc_order_shipping_partner
  on public.otc_order_shipping_dimension(company_id, delivery_partner_id)
  where delivery_partner_id is not null;
alter table public.otc_order_shipping_dimension enable row level security;
revoke all on public.otc_order_shipping_dimension from public,anon,authenticated;
grant select,insert,update,delete on public.otc_order_shipping_dimension to service_role;
commit;
