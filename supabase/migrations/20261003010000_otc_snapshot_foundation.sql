-- Order-to-Cash & Returns Control Layer — source snapshot foundation.
-- Approved design: docs/superpowers/specs/2026-10-03-order-to-cash-returns-control-design.md
-- Snapshot tables are server-write / RPC-read only. No browser role receives direct table access.

begin;

create table public.otc_delivery_lines (
  id bigint generated always as identity primary key,
  odoo_move_id bigint not null unique check (odoo_move_id > 0),
  odoo_picking_id bigint not null check (odoo_picking_id > 0),
  picking_name text,
  sale_order_line_id bigint,
  company_id bigint not null check (company_id in (1, 2)),
  customer_id bigint,
  salesperson_id bigint,
  product_id bigint not null check (product_id > 0),
  delivery_date timestamptz not null,
  delivered_qty numeric not null default 0 check (delivered_qty >= 0),
  delivered_value numeric,
  value_basis text not null default 'missing' check (value_basis in ('source', 'sale_order_line_estimate', 'missing')),
  source_state text not null default 'done',
  link_confidence text not null default 'unmatched' check (link_confidence in ('direct', 'inferred', 'unmatched')),
  source_updated_at timestamptz,
  last_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.otc_delivery_lines is 'Completed outgoing Odoo stock moves for Order-to-Cash reconciliation. One row per immutable stock.move id.';
comment on column public.otc_delivery_lines.delivered_value is 'Operational value estimate where direct source value is unavailable; value_basis records provenance.';

create table public.otc_return_lines (
  id bigint generated always as identity primary key,
  odoo_return_move_id bigint not null unique check (odoo_return_move_id > 0),
  odoo_return_picking_id bigint not null check (odoo_return_picking_id > 0),
  return_picking_name text,
  origin_returned_move_id bigint,
  sale_order_line_id bigint,
  company_id bigint not null check (company_id in (1, 2)),
  customer_id bigint,
  salesperson_id bigint,
  product_id bigint not null check (product_id > 0),
  return_receipt_date timestamptz not null,
  returned_qty numeric not null default 0 check (returned_qty >= 0),
  estimated_operational_value numeric,
  value_basis text not null default 'missing' check (value_basis in ('source', 'sale_order_line_estimate', 'missing')),
  return_reason text,
  source_state text not null default 'done',
  link_confidence text not null default 'unmatched' check (link_confidence in ('direct', 'inferred', 'unmatched')),
  source_updated_at timestamptz,
  last_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.otc_return_lines is 'Completed customer-return Odoo stock moves. Operational return event is independent from accounting credit notes.';

create table public.otc_invoice_lines (
  id bigint generated always as identity primary key,
  account_move_line_id bigint not null unique check (account_move_line_id > 0),
  account_move_id bigint not null check (account_move_id > 0),
  move_name text,
  move_type text not null check (move_type in ('out_invoice', 'out_refund')),
  sale_order_line_id bigint,
  sale_order_line_ids bigint[] not null default '{}'::bigint[],
  company_id bigint not null check (company_id in (1, 2)),
  customer_id bigint,
  salesperson_id bigint,
  product_id bigint not null check (product_id > 0),
  invoice_date date not null,
  quantity numeric not null default 0,
  price_subtotal numeric not null default 0,
  price_total numeric not null default 0,
  currency_id bigint,
  reversed_entry_id bigint,
  source_state text not null default 'posted' check (source_state = 'posted'),
  link_confidence text not null default 'unmatched' check (link_confidence in ('direct', 'inferred', 'unmatched')),
  allocation_status text not null default 'unmatched' check (allocation_status in ('single_link', 'multi_link_unallocated', 'unmatched')),
  source_updated_at timestamptz,
  last_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.otc_invoice_lines is 'Posted Odoo customer invoice and refund product lines. Multi-sale-line accounting rows remain unallocated until an approved allocation rule exists.';

create index otc_delivery_lines_scope_date_idx on public.otc_delivery_lines (company_id, delivery_date, salesperson_id);
create index otc_delivery_lines_sale_line_idx on public.otc_delivery_lines (sale_order_line_id) where sale_order_line_id is not null;
create index otc_delivery_lines_customer_product_idx on public.otc_delivery_lines (customer_id, product_id, delivery_date);
create index otc_delivery_lines_confidence_idx on public.otc_delivery_lines (link_confidence, company_id);

create index otc_return_lines_scope_date_idx on public.otc_return_lines (company_id, return_receipt_date, salesperson_id);
create index otc_return_lines_sale_line_idx on public.otc_return_lines (sale_order_line_id) where sale_order_line_id is not null;
create index otc_return_lines_origin_move_idx on public.otc_return_lines (origin_returned_move_id) where origin_returned_move_id is not null;
create index otc_return_lines_customer_product_idx on public.otc_return_lines (customer_id, product_id, return_receipt_date);
create index otc_return_lines_confidence_idx on public.otc_return_lines (link_confidence, company_id);

create index otc_invoice_lines_scope_date_idx on public.otc_invoice_lines (company_id, invoice_date, salesperson_id, move_type);
create index otc_invoice_lines_sale_line_idx on public.otc_invoice_lines (sale_order_line_id) where sale_order_line_id is not null;
create index otc_invoice_lines_customer_product_idx on public.otc_invoice_lines (customer_id, product_id, invoice_date, move_type);
create index otc_invoice_lines_allocation_idx on public.otc_invoice_lines (allocation_status, company_id, invoice_date);
create index otc_invoice_lines_sale_line_ids_gin_idx on public.otc_invoice_lines using gin (sale_order_line_ids);

alter table public.otc_delivery_lines enable row level security;
alter table public.otc_return_lines enable row level security;
alter table public.otc_invoice_lines enable row level security;

-- Defense in depth: these facts are not browser-readable. Edge Functions use service_role.
revoke all on table public.otc_delivery_lines from public, anon, authenticated;
revoke all on table public.otc_return_lines from public, anon, authenticated;
revoke all on table public.otc_invoice_lines from public, anon, authenticated;
grant all on table public.otc_delivery_lines to service_role;
grant all on table public.otc_return_lines to service_role;
grant all on table public.otc_invoice_lines to service_role;
grant usage, select on sequence public.otc_delivery_lines_id_seq to service_role;
grant usage, select on sequence public.otc_return_lines_id_seq to service_role;
grant usage, select on sequence public.otc_invoice_lines_id_seq to service_role;

commit;
