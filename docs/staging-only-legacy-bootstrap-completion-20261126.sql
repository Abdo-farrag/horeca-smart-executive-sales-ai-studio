-- HISTORICAL BOOTSTRAP COMPLETION for isolated Supabase Development Branch ONLY.
-- Based on read-only catalog metadata of project afzxhuaeggrngvchbvur.
-- Complements docs/staging-only-legacy-bootstrap-20261126.sql
-- All nine historically unrecorded public base tables are now accounted for.
-- No source rows copied. No Production DDL.
begin;
create table if not exists public.customer_product_history(
 odoo_line_id bigint primary key,
 order_id bigint,order_name text,order_date timestamptz,
 customer_id bigint,customer_name text,
 salesperson_id bigint,salesperson text,
 product_id bigint,product_name text,product_category text,
 qty_sold numeric default 0,unit_price numeric default 0,
 discount numeric default 0,subtotal numeric default 0,
 state text,created_at timestamptz default now(),
 updated_at timestamptz default now()
);
create table if not exists public.sync_logs(
 id uuid primary key default uuid_generate_v4(),
 sync_type text not null,status text not null,message text,
 rows_count integer default 0,
 started_at timestamptz default now(),
 finished_at timestamptz
);
create table if not exists public.raw_customers(
 customer_id bigint primary key,
 customer_name text,phone text,mobile text,email text,
 street text,street2 text,city text,country text,
 salesperson_id bigint,salesperson text,
 customer_rank integer default 0,supplier_rank integer default 0,
 active boolean default true,create_date timestamptz,
 write_date timestamptz,updated_at timestamptz default now(),
 name text,country_id bigint,user_id bigint
);
alter table public.customer_product_history enable row level security;
alter table public.sync_logs enable row level security;
alter table public.raw_customers enable row level security;
revoke all on public.customer_product_history,public.sync_logs,public.raw_customers
 from public,anon,authenticated;
comment on table public.customer_product_history is 'STAGING ONLY historical baseline; no customer data copied';
comment on table public.raw_customers is 'STAGING ONLY historical baseline; no customer data copied';
comment on table public.sync_logs is 'STAGING ONLY historical baseline; no operational logs copied';
commit;
