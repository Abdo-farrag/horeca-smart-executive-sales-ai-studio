-- Production contract snapshot: existing view column names, order and types.
-- This intentionally starts with an EXISTING view to exercise CREATE OR REPLACE VIEW.
create view public.otc_sale_line_reconciliation_v1 with (security_invoker=true) as
select
  null::bigint as sale_order_line_id,
  null::bigint as order_id,
  null::text as order_name,
  null::timestamptz as order_date,
  null::bigint as company_id,
  null::text as company_name,
  null::bigint as customer_id,
  null::text as customer_name,
  null::bigint as salesperson_id,
  null::text as salesperson_name,
  null::bigint as product_id,
  null::text as product_name,
  null::text as brand,
  null::text as category,
  null::text as governorate_code,
  null::text as governorate_name_ar,
  null::text as area_code,
  null::text as area_name_ar,
  null::numeric as ordered_qty,
  null::numeric as ordered_value,
  null::numeric as gross_delivered_qty,
  null::numeric as gross_delivered_value,
  null::numeric as returned_qty,
  null::numeric as returned_value,
  null::numeric as net_delivered_qty,
  null::numeric as net_delivered_value,
  null::numeric as gross_invoiced_qty,
  null::numeric as gross_invoiced_value,
  null::numeric as credit_note_qty,
  null::numeric as credit_note_value,
  null::numeric as net_invoiced_qty,
  null::numeric as net_invoiced_value,
  null::numeric as delivery_gap_qty,
  null::numeric as delivery_gap_value,
  null::numeric as invoice_gap_qty,
  null::numeric as invoice_gap_value,
  null::numeric as return_rate_pct,
  null::timestamptz as first_delivery_at,
  null::timestamptz as last_delivery_at,
  null::timestamptz as first_return_at,
  null::timestamptz as last_return_at,
  null::date as first_invoice_date,
  null::date as last_invoice_date,
  null::date as first_credit_note_date,
  null::date as last_credit_note_date,
  null::bigint as inferred_delivery_events,
  null::bigint as inferred_return_events
where false;

-- Existing RPC contract; replacement must preserve result types and signature.
create function public.analytics_order_to_cash_kpis_v1(
  p_start_date date,
  p_end_date date,
  p_company_name text default null,
  p_salesperson_id bigint default null,
  p_customer_id bigint default null,
  p_product_id bigint default null,
  p_brand text default null,
  p_category text default null,
  p_governorate_code text default null,
  p_area_code text default null,
  p_date_basis text default 'order_cohort'
)
returns table (
  date_basis text,
  ordered_qty numeric,
  ordered_value numeric,
  gross_delivered_qty numeric,
  gross_delivered_value numeric,
  returned_qty numeric,
  returned_value numeric,
  net_delivered_qty numeric,
  net_delivered_value numeric,
  gross_invoiced_qty numeric,
  gross_invoiced_value numeric,
  credit_note_qty numeric,
  credit_note_value numeric,
  net_invoiced_qty numeric,
  net_invoiced_value numeric,
  delivery_gap_qty numeric,
  delivery_gap_value numeric,
  invoice_gap_qty numeric,
  invoice_gap_value numeric,
  return_rate_pct numeric,
  uncredited_returns_count bigint,
  uncredited_returns_value numeric,
  direct_link_pct numeric,
  inferred_link_pct numeric,
  unmatched_link_count bigint
)
language plpgsql stable security definer set search_path=public,auth as $$
begin
  return;
end;
$$;

-- Existing RPC contract; replacement must preserve result types and signature.
create function public.analytics_order_to_cash_trend_v1(
  p_start_date date,
  p_end_date date,
  p_company_name text default null,
  p_salesperson_id bigint default null,
  p_customer_id bigint default null,
  p_product_id bigint default null,
  p_brand text default null,
  p_category text default null,
  p_governorate_code text default null,
  p_area_code text default null,
  p_date_basis text default 'event',
  p_grain text default 'day'
)
returns table (
  period_start date,
  date_basis text,
  ordered_value numeric,
  gross_delivered_value numeric,
  returned_value numeric,
  net_delivered_value numeric,
  gross_invoiced_value numeric,
  credit_note_value numeric,
  net_invoiced_value numeric
)
language plpgsql stable security definer set search_path=public,auth as $$
begin
  return;
end;
$$;

