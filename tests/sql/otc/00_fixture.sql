-- Isolated PostgreSQL 17 fixture. All rows are synthetic; no production connection.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role',true),'')
$$;

create table public.customer_product_history (
  odoo_line_id bigint, order_id bigint, salesperson_id bigint
);
create table public.product_sales_from_june1 (
  odoo_line_id bigint primary key,
  order_id bigint,
  order_name text,
  order_date timestamptz,
  company_id bigint,
  company_name text,
  customer_id bigint,
  customer_name text,
  salesperson text,
  product_id bigint,
  product_name text,
  product_category text,
  qty_sold numeric,
  subtotal numeric
);
create table public.customer_master_odoo18 (
  customer_id bigint, company_id bigint, write_date timestamptz
);
create table public.customer_geography_odoo18 (
  customer_id bigint, company_id bigint, customer_name text,
  governorate_code text, governorate_name_ar text,
  area_code text, area_name_ar text,
  geography_source text, geography_confidence numeric,
  needs_review boolean
);
create table public.sales_orders_odoo18_secure (
  order_id bigint primary key, salesperson_id bigint
);
create table public.product_knowledge (
  product_id bigint primary key, brand text, category text
);
create table public.geography_area_master (
  area_code text primary key, area_name_ar text,
  governorate_code text, governorate_name_ar text,
  priority integer, is_active boolean
);
create table public.geography_area_keywords (
  id bigint primary key, area_code text, keyword_normalized text,
  weight integer, is_active boolean
);
create table public.otc_delivery_lines (
  odoo_move_id bigint primary key,
  sale_order_line_id bigint, company_id bigint, customer_id bigint,
  salesperson_id bigint, product_id bigint,
  delivery_date timestamptz, delivered_qty numeric, delivered_value numeric,
  link_confidence text
);
create table public.otc_return_lines (
  odoo_return_move_id bigint primary key,
  sale_order_line_id bigint, company_id bigint, customer_id bigint,
  salesperson_id bigint, product_id bigint,
  return_receipt_date timestamptz, returned_qty numeric,
  estimated_operational_value numeric, link_confidence text
);
create table public.otc_invoice_lines (
  account_move_line_id bigint primary key,
  sale_order_line_id bigint, company_id bigint, customer_id bigint,
  salesperson_id bigint, product_id bigint,
  invoice_date date, move_type text, quantity numeric,
  price_subtotal numeric, allocation_status text, source_state text,
  link_confidence text
);
-- The real security function is defined in the earlier OTC base migration.
-- This isolated fixture stubs it; these tests do NOT certify production authorization.
create function public.otc_scope_row_allowed(bigint,bigint)
returns boolean language sql stable as $$ select $1 in (1,2) $$;

insert into public.customer_master_odoo18 values
 (101,1,'2026-10-01'),(102,1,'2026-10-01'),(101,2,'2026-10-01');
insert into public.customer_geography_odoo18 values
 (101,null,'Shared Parent','GIZA','الجيزة','SHEIKH_ZAYED','الشيخ زايد','synthetic',0.9,false),
 (102,1,'Other Customer','GIZA','الجيزة','DOKKI','الدقي','synthetic',0.9,false);
insert into public.product_knowledge values (501,'Demo Brand','Demo Category');
insert into public.sales_orders_odoo18_secure values (1001,900),(1002,900),(1003,901),(2001,902);
insert into public.product_sales_from_june1 values
 (1101,1001,'HS1001','2026-10-01 10:00+00',1,'MAS',101,'Customer A','Rep A',501,'Demo Product','Demo Category',10,100),
 (1102,1002,'HS1002','2026-10-02 10:00+00',1,'MAS',101,'Customer A','Rep A',501,'Demo Product','Demo Category',5,50),
 (1103,1003,'HS1003','2026-10-03 10:00+00',1,'MAS',102,'Customer B','Rep B',501,'Demo Product','Demo Category',2,20),
 (2101,2001,'MS2001','2026-10-04 10:00+00',2,'Horeca Smart',101,'Customer C','Rep C',501,'Demo Product','Demo Category',3,30);
insert into public.customer_product_history values (1101,1001,900),(1102,1002,900),(1103,1003,901),(2101,2001,902);
insert into public.geography_area_master values
 ('NASR','مدينة نصر','CAIRO','القاهرة',1,true),
 ('MAADI','المعادي','CAIRO','القاهرة',2,true);
insert into public.geography_area_keywords values
 (1,'NASR','nasr city',10,true),
 (2,'MAADI','maadi',10,true);
insert into public.otc_delivery_lines values
 (3001,1101,1,101,900,501,'2026-10-02',10,100,'direct'),
 (3002,1102,1,101,900,501,'2026-10-03',5,50,'direct'),
 (3003,2101,2,101,902,501,'2026-10-05',3,30,'direct');
insert into public.otc_return_lines values
 (4001,1101,1,101,900,501,'2026-10-06',2,20,'direct');
insert into public.otc_invoice_lines values
 (5001,1101,1,101,900,501,'2026-10-02','out_invoice',10,100,'single_link','posted','direct'),
 (5002,1101,1,101,900,501,'2026-10-06','out_refund',2,20,'single_link','posted','direct'),
 (5003,1102,1,101,900,501,'2026-10-03','out_invoice',5,50,'single_link','posted','direct');
