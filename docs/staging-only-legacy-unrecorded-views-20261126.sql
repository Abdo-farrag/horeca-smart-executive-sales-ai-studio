-- Isolated staging only: pre-existing legacy views missing from recorded migrations.
-- Definitions from parent pg_get_viewdef, no data copied.
begin;
create or replace view public.v_customer_master with (security_invoker=true) as
 SELECT c.customer_id,
    c.customer_name,
    c.phone,
    c.mobile,
    c.email,
    c.city,
    c.salesperson,
    count(DISTINCT h.order_id) AS orders_count,
    sum(h.subtotal) AS total_sales,
    max(h.order_date) AS last_order_date,
    min(h.order_date) AS first_order_date,
    count(DISTINCT h.product_id) AS unique_products_count,
        CASE
            WHEN max(h.order_date) >= (now() - '30 days'::interval) THEN 'ACTIVE'::text
            WHEN max(h.order_date) >= (now() - '60 days'::interval) THEN 'AT_RISK'::text
            WHEN max(h.order_date) IS NULL THEN 'NO_ORDERS'::text
            ELSE 'LOST'::text
        END AS customer_status
   FROM raw_customers c
     LEFT JOIN customer_product_history h ON c.customer_id = h.customer_id
  GROUP BY c.customer_id, c.customer_name, c.phone, c.mobile, c.email, c.city, c.salesperson;
create or replace view public.v_customer_product_summary with (security_invoker=true) as
 SELECT customer_id,
    max(customer_name) AS customer_name,
    product_id,
    max(product_name) AS product_name,
    max(product_category) AS product_category,
    sum(qty_sold) AS total_qty_sold,
    sum(subtotal) AS total_sales,
    count(DISTINCT order_id) AS orders_count,
    min(order_date) AS first_purchase_date,
    max(order_date) AS last_purchase_date,
        CASE
            WHEN count(DISTINCT order_id) > 0 THEN sum(qty_sold) / count(DISTINCT order_id)::numeric
            ELSE 0::numeric
        END AS avg_qty_per_order
   FROM customer_product_history
  WHERE state = ANY (ARRAY['sale'::text, 'done'::text])
  GROUP BY customer_id, product_id;
create or replace view public.v_product_buyers with (security_invoker=true) as
 SELECT product_id,
    max(product_name) AS product_name,
    customer_id,
    max(customer_name) AS customer_name,
    max(salesperson) AS salesperson,
    sum(qty_sold) AS total_qty_sold,
    sum(subtotal) AS total_sales,
    count(DISTINCT order_id) AS orders_count,
    max(order_date) AS last_purchase_date
   FROM customer_product_history
  WHERE state = ANY (ARRAY['sale'::text, 'done'::text])
  GROUP BY product_id, customer_id;
create or replace view public.v_procurement_phase1_attention with (security_invoker=true) as
 SELECT
        CASE phase1_test_status
            WHEN 'OUT_OF_STOCK_FORECAST'::text THEN 1
            WHEN 'CRITICAL'::text THEN 2
            WHEN 'REORDER'::text THEN 3
            WHEN 'WATCH'::text THEN 4
            ELSE 9
        END AS priority_rank,
    product_id,
    internal_reference,
    product_name,
    company_id,
    company_name,
    quantity_on_hand,
    reserved_quantity,
    available_quantity,
    incoming_confirmed_qty,
    outgoing_confirmed_qty,
    forecasted_quantity,
    snapshot_at,
    sales_qty_7d,
    sales_qty_30d,
    sales_qty_since_june1,
    orders_30d,
    customers_30d,
    last_sale_at,
    intercompany_lines_excluded,
    intercompany_qty_excluded,
    avg_daily_sales_7d,
    avg_daily_sales_30d,
    avg_daily_sales_since_june1,
    days_cover_available_30d,
    days_cover_forecast_30d,
    qty_to_7_days,
    qty_to_14_days,
    qty_to_21_days,
    reserved_formula_variance,
    forecast_formula_variance,
    demand_trend,
    phase1_test_status
   FROM v_procurement_kpi_phase1_company
  WHERE phase1_test_status = ANY (ARRAY['OUT_OF_STOCK_FORECAST'::text, 'CRITICAL'::text, 'REORDER'::text, 'WATCH'::text]);
create or replace view public.v_procurement_phase1_dashboard_summary with (security_invoker=true) as
 SELECT company_id,
    company_name,
    count(*) AS total_products,
    count(*) FILTER (WHERE phase1_test_status = ANY (ARRAY['OUT_OF_STOCK_FORECAST'::text, 'CRITICAL'::text, 'REORDER'::text, 'WATCH'::text])) AS attention_products,
    count(*) FILTER (WHERE phase1_test_status = 'OUT_OF_STOCK_FORECAST'::text) AS out_of_stock_forecast_products,
    count(*) FILTER (WHERE phase1_test_status = 'CRITICAL'::text) AS critical_products,
    count(*) FILTER (WHERE phase1_test_status = 'REORDER'::text) AS reorder_products,
    count(*) FILTER (WHERE phase1_test_status = 'WATCH'::text) AS watch_products,
    count(*) FILTER (WHERE phase1_test_status = 'HEALTHY'::text) AS healthy_products,
    count(*) FILTER (WHERE phase1_test_status = 'OVERSTOCK'::text) AS overstock_products,
    count(*) FILTER (WHERE phase1_test_status = 'NO_DEMAND'::text) AS no_demand_products,
    round(COALESCE(sum(qty_to_14_days) FILTER (WHERE phase1_test_status = ANY (ARRAY['OUT_OF_STOCK_FORECAST'::text, 'CRITICAL'::text, 'REORDER'::text, 'WATCH'::text])), 0::numeric), 2) AS attention_qty_to_14_days,
    max(snapshot_at) AS latest_forecast_snapshot,
    max(last_sale_at) AS latest_sale_at
   FROM v_procurement_kpi_phase1_company
  GROUP BY company_id, company_name;
revoke all on public.v_customer_master,public.v_customer_product_summary,public.v_product_buyers,public.v_procurement_phase1_attention,public.v_procurement_phase1_dashboard_summary from public,anon,authenticated;
commit;
