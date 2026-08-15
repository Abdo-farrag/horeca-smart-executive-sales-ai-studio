-- FIX BATCH 1: Risk filter + Executive v2 RPCs

-- 1. analytics_customer_action_center_v2
CREATE OR REPLACE FUNCTION public.analytics_customer_action_center_v2(
  p_as_of_date date DEFAULT NULL::date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_priority text DEFAULT NULL::text,
  p_action_type text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT NULL::integer,
  p_offset integer DEFAULT NULL::integer,
  p_risk text DEFAULT NULL::text
)
RETURNS TABLE(
  customer_id integer,
  customer_name text,
  company_name text,
  salesperson text,
  priority text,
  action_type text,
  action_reason text,
  last_order_date date,
  days_since_last_order integer,
  median_buying_interval integer,
  previous_30d_sales numeric,
  recent_30d_sales numeric,
  sales_change_pct numeric,
  recovery_opportunity numeric,
  risk text,
  salesperson_changed boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.customer_id, ac.customer_name, ac.company_name, ac.salesperson,
         ac.priority, ac.action_type, ac.action_reason, ac.last_order_date,
         ac.days_since_last_order, ac.median_buying_interval, ac.previous_30d_sales,
         ac.recent_30d_sales, ac.sales_change_pct, ac.recovery_opportunity,
         ac.risk, ac.salesperson_changed
  FROM public.analytics_customer_action_center(
    p_as_of_date, p_company_name, p_salesperson, p_priority, p_action_type, p_search, p_limit, p_offset
  ) ac
  WHERE (p_risk IS NULL OR LOWER(ac.risk) = LOWER(p_risk));
END;
$$;

-- 2. analytics_sales_rep_daily_actions_v2
CREATE OR REPLACE FUNCTION public.analytics_sales_rep_daily_actions_v2(
  p_as_of_date date DEFAULT NULL::date,
  p_salesperson text DEFAULT NULL::text,
  p_company_name text DEFAULT NULL::text,
  p_priority text DEFAULT NULL::text,
  p_action_type text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT NULL::integer,
  p_offset integer DEFAULT NULL::integer,
  p_risk text DEFAULT NULL::text
)
RETURNS TABLE(
  action_rank integer,
  customer_id integer,
  customer_name text,
  company_name text,
  salesperson text,
  priority text,
  action_type text,
  action_reason text,
  risk text,
  last_order_date date,
  days_since_last_order integer,
  median_buying_interval integer,
  previous_30d_sales numeric,
  recent_30d_sales numeric,
  sales_change_pct numeric,
  recovery_opportunity numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT da.action_rank, da.customer_id, da.customer_name, da.company_name,
         da.salesperson, da.priority, da.action_type, da.action_reason,
         da.risk, da.last_order_date, da.days_since_last_order,
         da.median_buying_interval, da.previous_30d_sales, da.recent_30d_sales,
         da.sales_change_pct, da.recovery_opportunity
  FROM public.analytics_sales_rep_daily_actions(
    p_as_of_date, p_salesperson, p_company_name, p_priority, p_action_type, p_search, p_limit, p_offset
  ) da
  WHERE (p_risk IS NULL OR LOWER(da.risk) = LOWER(p_risk));
END;
$$;

-- 3. analytics_top_customers_v2
CREATE OR REPLACE FUNCTION public.analytics_top_customers_v2(
  p_start_date date,
  p_end_date date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_customer_id integer DEFAULT NULL::integer,
  p_product_id integer DEFAULT NULL::integer,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  customer_id integer,
  customer_name text,
  company_name text,
  orders_count bigint,
  sales_value numeric,
  average_order_value numeric,
  last_order_at text,
  primary_salesperson text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.customer_id::integer,
    cs.customer_name::text,
    cs.company_name::text,
    cs.orders_count::bigint,
    cs.sales_value::numeric,
    cs.average_order_value::numeric,
    cs.last_order_date::text AS last_order_at,
    cs.primary_salesperson::text
  FROM public.analytics_customer_summary_v2(
    p_start_date, p_end_date, p_company_name, p_salesperson,
    p_governorate_code, p_area_code, p_customer_id, p_product_id
  ) cs
  ORDER BY cs.sales_value DESC
  LIMIT p_limit;
END;
$$;

-- 4. analytics_customer_retention_summary_v2
CREATE OR REPLACE FUNCTION public.analytics_customer_retention_summary_v2(
  p_month date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_customer_id integer DEFAULT NULL::integer,
  p_product_id integer DEFAULT NULL::integer
)
RETURNS TABLE(
  previous_active_customers bigint,
  retained_with_same_rep bigint,
  transferred_customers bigint,
  true_lost_customers bigint,
  new_customers bigint,
  company_retention_rate numeric,
  same_rep_retention_rate numeric,
  lost_customer_revenue_egp numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.analytics_customer_retention_summary(
    p_month, p_company_name, p_salesperson
  );
END;
$$;

-- 5. analytics_sales_rep_summary_v2
CREATE OR REPLACE FUNCTION public.analytics_sales_rep_summary_v2(
  p_month date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_customer_id integer DEFAULT NULL::integer,
  p_product_id integer DEFAULT NULL::integer
)
RETURNS TABLE(
  order_month text,
  company_name text,
  salesperson text,
  active_customers bigint,
  orders_count bigint,
  sales_value numeric,
  average_order_value numeric,
  previous_customers bigint,
  retained_customers bigint,
  lost_customers bigint,
  transferred_out_customers bigint,
  transferred_in_customers bigint,
  new_customers bigint,
  reactivated_customers bigint,
  lost_previous_sales numeric,
  retention_rate numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.analytics_sales_rep_summary(
    p_month, p_company_name, p_salesperson
  );
END;
$$;
