-- Staging ONLY / schema-only historical bootstrap (not a Supabase migration).
-- Source: parent project afzxhuaeggrngvchbvur; information_schema / pg_indexes / pg_get_viewdef.
-- No rows copied. No Production writes. Does not certify full historical replay.
begin;
create table if not exists public.manual_current_stock (
 internal_reference text primary key,
 product_name text not null,
 sales_price numeric default 0,
 cost numeric default 0,
 quantity_on_hand numeric default 0,
 forecasted_quantity numeric default 0,
 snapshot_date date default current_date,
 updated_at timestamptz default now()
);
create table if not exists public.raw_sales_lines (
 id uuid primary key default uuid_generate_v4(),
 odoo_line_id bigint,order_id bigint,order_name text,order_date timestamptz,
 customer_id bigint,customer_name text,salesperson text,product_id bigint,
 product_name text,qty_sold numeric default 0,subtotal numeric default 0,
 state text,created_at timestamptz default now()
);
create table if not exists public.sku_master (
 product_id bigint primary key,product_name text,internal_reference text,category text,
 cost numeric default 0,sale_price numeric default 0,total_qty_sold_90d numeric default 0,
 avg_daily_sales numeric default 0,current_stock numeric default 0,lead_time_days integer default 4,
 safety_stock numeric default 0,reorder_point numeric default 0,max_stock numeric default 0,
 suggested_order_qty numeric default 0,gross_margin_value numeric default 0,
 gross_margin_percent numeric default 0,status text,sku_class text,is_kvi boolean default false,
 last_calculated_at timestamptz default now(),primary_supplier text,backup_supplier text
);
create table if not exists public.sku_supplier_settings (
 id uuid primary key default uuid_generate_v4(),
 product_id bigint unique,primary_supplier text,backup_supplier text,
 lead_time_days integer default 4,safety_days integer default 7,
 max_coverage_days integer default 14,min_margin_target numeric default 0.08,
 is_kvi boolean default false,sku_class text default 'B',notes text,
 updated_at timestamptz default now()
);
create table if not exists public.purchase_recommendations (
 id uuid primary key default uuid_generate_v4(),
 product_id bigint,product_name text,category text,current_stock numeric default 0,
 reorder_point numeric default 0,max_stock numeric default 0,suggested_order_qty numeric default 0,
 status text,action text,primary_supplier text,backup_supplier text,priority text,
 created_at timestamptz default now()
);
create or replace view public.v_sales_90d as
select product_id,max(product_name) as product_name,
       sum(qty_sold) as total_qty_sold_90d,sum(qty_sold)/90.0 as avg_daily_sales
from public.raw_sales_lines
where order_date >= now()-interval '90 days'
  and state=any(array['sale'::text,'done'::text])
group by product_id;
alter table public.manual_current_stock enable row level security;
alter table public.raw_sales_lines enable row level security;
alter table public.sku_master enable row level security;
alter table public.sku_supplier_settings enable row level security;
alter table public.purchase_recommendations enable row level security;
revoke all on public.manual_current_stock,public.raw_sales_lines,public.sku_master,
 public.sku_supplier_settings,public.purchase_recommendations from public,anon,authenticated;
revoke all on public.v_sales_90d from public,anon,authenticated;
commit;
