-- ==============================================================================
-- MIGRATION: 20260816000000_ai_b3_drilldown_v2_rpcs.sql
-- DESCRIPTION: Six full-scope B3 analytical drill-down functions for Executive AI.
--
-- VERIFIED PRODUCTION SCHEMA & JOIN RULES:
--   1. Confirmed Orders: public.sales_orders_odoo18_geo
--      Order Date: order_date_cairo
--      Order Revenue: order_value
--      Geography Columns: governorate_name_ar, area_name_ar (aliased to governorate_name, area_name)
--   2. Product Lines: public.product_sales_from_june1 joined by order_id to sales_orders_odoo18_geo.
--      Columns: product_category (aliased to category_name), qty_sold (aliased to quantity), subtotal
--
-- SECURITY: No PII (phone, mobile, email, address) or payment data returned.
-- ==============================================================================

-- ==============================================================================
-- 1. analytics_customer_orders_v2
-- Purpose: Bounded confirmed customer order history respecting full global filters.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.analytics_customer_orders_v2(
  p_customer_id bigint,
  p_start_date date,
  p_end_date date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_product_id bigint DEFAULT NULL::bigint,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  order_id bigint,
  order_name text,
  order_date date,
  company_name text,
  salesperson text,
  governorate_name text,
  area_name text,
  order_value numeric,
  lines_count integer,
  products_count integer,
  total_qty numeric,
  order_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_offset integer;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'p_customer_id is required';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 20);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  SELECT
    o.order_id::bigint,
    o.order_name::text,
    o.order_date_cairo::date AS order_date,
    o.company_name::text,
    o.salesperson::text,
    o.governorate_name_ar::text AS governorate_name,
    o.area_name_ar::text AS area_name,
    COALESCE(o.order_value, 0)::numeric AS order_value,
    COALESCE(o.lines_count, 0)::integer AS lines_count,
    COALESCE(o.products_count, 0)::integer AS products_count,
    COALESCE(o.total_qty, 0)::numeric AS total_qty,
    'CONFIRMED'::text AS order_status
  FROM public.sales_orders_odoo18_geo o
  WHERE o.customer_id = p_customer_id
    AND o.order_date_cairo BETWEEN p_start_date AND p_end_date
    AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
    AND (p_salesperson IS NULL OR LOWER(o.salesperson) = LOWER(p_salesperson))
    AND (p_governorate_code IS NULL OR o.governorate_code = p_governorate_code)
    AND (p_area_code IS NULL OR o.area_code = p_area_code)
    AND (
      p_product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.product_sales_from_june1 ps
        WHERE ps.order_id = o.order_id
          AND ps.product_id = p_product_id
      )
    )
  ORDER BY o.order_date_cairo DESC, o.order_id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;


-- ==============================================================================
-- 2. analytics_customer_product_dropoff_v2
-- Purpose: Customer stopped or declining products comparing current vs previous equal period.
-- Fix: Correct evaluation order ensures NEW_PRODUCT is evaluated before GROWING.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.analytics_customer_product_dropoff_v2(
  p_customer_id bigint,
  p_start_date date,
  p_end_date date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_product_id bigint DEFAULT NULL::bigint,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  product_id bigint,
  product_name text,
  category_name text,
  previous_sales numeric,
  current_sales numeric,
  previous_qty numeric,
  current_qty numeric,
  sales_change_pct numeric,
  status text,
  recovery_value numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_days integer;
  v_prev_start date;
  v_prev_end date;
  v_limit integer;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'p_customer_id is required';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  v_period_days := (p_end_date - p_start_date) + 1;
  v_prev_start := p_start_date - v_period_days;
  v_prev_end := p_start_date - 1;
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);

  RETURN QUERY
  WITH scoped_orders AS (
    SELECT o.order_id, o.order_date_cairo
    FROM public.sales_orders_odoo18_geo o
    WHERE o.customer_id = p_customer_id
      AND o.order_date_cairo BETWEEN v_prev_start AND p_end_date
      AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
      AND (p_salesperson IS NULL OR LOWER(o.salesperson) = LOWER(p_salesperson))
      AND (p_governorate_code IS NULL OR o.governorate_code = p_governorate_code)
      AND (p_area_code IS NULL OR o.area_code = p_area_code)
  ),
  current_product_sales AS (
    SELECT
      ps.product_id,
      MAX(ps.product_name) AS product_name,
      MAX(ps.product_category) AS product_category,
      SUM(COALESCE(ps.subtotal, 0)) AS sales_value,
      SUM(COALESCE(ps.qty_sold, 0)) AS qty_sold
    FROM public.product_sales_from_june1 ps
    JOIN scoped_orders o ON o.order_id = ps.order_id
    WHERE o.order_date_cairo BETWEEN p_start_date AND p_end_date
      AND (p_product_id IS NULL OR ps.product_id = p_product_id)
    GROUP BY ps.product_id
  ),
  previous_product_sales AS (
    SELECT
      ps.product_id,
      MAX(ps.product_name) AS product_name,
      MAX(ps.product_category) AS product_category,
      SUM(COALESCE(ps.subtotal, 0)) AS sales_value,
      SUM(COALESCE(ps.qty_sold, 0)) AS qty_sold
    FROM public.product_sales_from_june1 ps
    JOIN scoped_orders o ON o.order_id = ps.order_id
    WHERE o.order_date_cairo BETWEEN v_prev_start AND v_prev_end
      AND (p_product_id IS NULL OR ps.product_id = p_product_id)
    GROUP BY ps.product_id
  ),
  merged AS (
    SELECT
      COALESCE(curr.product_id, prev.product_id)::bigint AS m_product_id,
      COALESCE(curr.product_name, prev.product_name, '')::text AS m_product_name,
      COALESCE(curr.product_category, prev.product_category, '')::text AS m_category_name,
      COALESCE(prev.sales_value, 0)::numeric AS m_prev_sales,
      COALESCE(curr.sales_value, 0)::numeric AS m_curr_sales,
      COALESCE(prev.qty_sold, 0)::numeric AS m_prev_qty,
      COALESCE(curr.qty_sold, 0)::numeric AS m_curr_qty
    FROM current_product_sales curr
    FULL OUTER JOIN previous_product_sales prev ON curr.product_id = prev.product_id
  ),
  evaluated AS (
    SELECT
      m.m_product_id AS product_id,
      m.m_product_name AS product_name,
      m.m_category_name AS category_name,
      m.m_prev_sales AS previous_sales,
      m.m_curr_sales AS current_sales,
      m.m_prev_qty AS previous_qty,
      m.m_curr_qty AS current_qty,
      CASE
        WHEN m.m_prev_sales = 0 THEN NULL::numeric
        ELSE ((m.m_curr_sales - m.m_prev_sales) / m.m_prev_sales * 100)::numeric
      END AS sales_change_pct,
      CASE
        WHEN m.m_prev_sales > 0 AND m.m_curr_sales = 0 THEN 'STOPPED_BUYING'::text
        WHEN m.m_prev_sales > 0 AND m.m_curr_sales > 0 AND m.m_curr_sales < m.m_prev_sales THEN 'DECLINING'::text
        WHEN m.m_prev_sales = 0 AND m.m_curr_sales > 0 THEN 'NEW_PRODUCT'::text
        WHEN m.m_curr_sales > m.m_prev_sales THEN 'GROWING'::text
        ELSE 'STABLE'::text
      END AS status,
      CASE
        WHEN m.m_prev_sales > m.m_curr_sales THEN GREATEST(m.m_prev_sales - m.m_curr_sales, 0)::numeric
        ELSE 0::numeric
      END AS recovery_value
    FROM merged m
  )
  SELECT
    e.product_id,
    e.product_name,
    e.category_name,
    e.previous_sales,
    e.current_sales,
    e.previous_qty,
    e.current_qty,
    e.sales_change_pct,
    e.status,
    e.recovery_value
  FROM evaluated e
  ORDER BY e.recovery_value DESC, e.previous_sales DESC
  LIMIT v_limit;
END;
$$;


-- ==============================================================================
-- 3. analytics_customer_favorite_products_v2
-- Purpose: Top purchased products and mix for a customer under active filters.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.analytics_customer_favorite_products_v2(
  p_customer_id bigint,
  p_start_date date,
  p_end_date date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  product_id bigint,
  product_name text,
  sales_value numeric,
  orders_count bigint,
  quantity numeric,
  sales_share_pct numeric,
  last_order_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'p_customer_id is required';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);

  RETURN QUERY
  WITH scoped_orders AS (
    SELECT o.order_id, o.order_date_cairo
    FROM public.sales_orders_odoo18_geo o
    WHERE o.customer_id = p_customer_id
      AND o.order_date_cairo BETWEEN p_start_date AND p_end_date
      AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
      AND (p_salesperson IS NULL OR LOWER(o.salesperson) = LOWER(p_salesperson))
      AND (p_governorate_code IS NULL OR o.governorate_code = p_governorate_code)
      AND (p_area_code IS NULL OR o.area_code = p_area_code)
  ),
  product_agg AS (
    SELECT
      ps.product_id::bigint AS product_id,
      MAX(ps.product_name)::text AS product_name,
      SUM(COALESCE(ps.subtotal, 0))::numeric AS sales_value,
      COUNT(DISTINCT o.order_id)::bigint AS orders_count,
      SUM(COALESCE(ps.qty_sold, 0))::numeric AS quantity,
      MAX(o.order_date_cairo)::date AS last_order_date
    FROM public.product_sales_from_june1 ps
    JOIN scoped_orders o ON o.order_id = ps.order_id
    GROUP BY ps.product_id
  ),
  totals AS (
    SELECT SUM(pa.sales_value) AS total_sales FROM product_agg pa
  )
  SELECT
    pa.product_id,
    pa.product_name,
    pa.sales_value,
    pa.orders_count,
    pa.quantity,
    CASE
      WHEN COALESCE(t.total_sales, 0) = 0 THEN NULL::numeric
      ELSE (pa.sales_value / t.total_sales * 100)::numeric
    END AS sales_share_pct,
    pa.last_order_date
  FROM product_agg pa
  CROSS JOIN totals t
  ORDER BY pa.sales_value DESC, pa.orders_count DESC
  LIMIT v_limit;
END;
$$;


-- ==============================================================================
-- 4. analytics_product_top_customers_v2
-- Purpose: Top purchasing customers for a specific product respecting all filters.
-- Separation: Groups by (customer_id, company_name) so Company = ALL doesn't merge cross-company entities.
-- Primary Salesperson: Uses MODE() WITHIN GROUP (ORDER BY salesperson).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.analytics_product_top_customers_v2(
  p_product_id bigint,
  p_start_date date,
  p_end_date date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_customer_id bigint DEFAULT NULL::bigint,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  customer_id bigint,
  customer_name text,
  company_name text,
  salesperson text,
  governorate_name text,
  area_name text,
  orders_count bigint,
  sales_value numeric,
  quantity numeric,
  last_order_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'p_product_id is required';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);

  RETURN QUERY
  WITH scoped_orders AS (
    SELECT
      o.order_id,
      o.customer_id,
      o.customer_name,
      o.company_name,
      o.salesperson,
      o.governorate_name_ar,
      o.area_name_ar,
      o.order_date_cairo
    FROM public.sales_orders_odoo18_geo o
    WHERE o.order_date_cairo BETWEEN p_start_date AND p_end_date
      AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
      AND (p_salesperson IS NULL OR LOWER(o.salesperson) = LOWER(p_salesperson))
      AND (p_governorate_code IS NULL OR o.governorate_code = p_governorate_code)
      AND (p_area_code IS NULL OR o.area_code = p_area_code)
      AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
  )
  SELECT
    o.customer_id::bigint,
    MAX(o.customer_name)::text AS customer_name,
    o.company_name::text AS company_name,
    COALESCE(MODE() WITHIN GROUP (ORDER BY o.salesperson), MAX(o.salesperson), '')::text AS salesperson,
    MAX(o.governorate_name_ar)::text AS governorate_name,
    MAX(o.area_name_ar)::text AS area_name,
    COUNT(DISTINCT o.order_id)::bigint AS orders_count,
    SUM(COALESCE(ps.subtotal, 0))::numeric AS sales_value,
    SUM(COALESCE(ps.qty_sold, 0))::numeric AS quantity,
    MAX(o.order_date_cairo)::date AS last_order_date
  FROM public.product_sales_from_june1 ps
  JOIN scoped_orders o ON o.order_id = ps.order_id
  WHERE ps.product_id = p_product_id
  GROUP BY o.customer_id, o.company_name
  ORDER BY sales_value DESC, orders_count DESC
  LIMIT v_limit;
END;
$$;


-- ==============================================================================
-- 5. analytics_customer_retention_details_v2
-- Purpose: Named customer list for retention cohorts (LOST, RETAINED, TRANSFERRED, REACTIVATED, NEW_IN_WINDOW).
-- Rebuilt directly from the exact CTE chain of production analytics_customer_retention_summary_v2:
-- params -> order_base -> scoped_orders -> rep_activity -> ranked -> totals -> activity -> current_and_previous -> lost -> retention_rows -> filtered
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.analytics_customer_retention_details_v2(
  p_month date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_customer_id bigint DEFAULT NULL::bigint,
  p_product_id bigint DEFAULT NULL::bigint,
  p_status text DEFAULT NULL::text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  company_name text,
  customer_id bigint,
  customer_name text,
  previous_salesperson text,
  current_salesperson text,
  previous_orders bigint,
  current_orders bigint,
  previous_sales numeric,
  current_sales numeric,
  retention_status text,
  sales_change_pct numeric,
  previous_last_order_date date,
  current_last_order_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_start date;
  v_current_end date;
  v_prev_start date;
  v_prev_end date;
  v_limit integer;
  v_offset integer;
BEGIN
  IF p_month IS NULL THEN
    RAISE EXCEPTION 'p_month is required';
  END IF;

  v_current_start := date_trunc('month', p_month)::date;
  v_current_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_prev_start := (date_trunc('month', p_month) - interval '1 month')::date;
  v_prev_end := (date_trunc('month', p_month) - interval '1 day')::date;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  WITH params AS (
    SELECT
      v_current_start AS cur_start,
      v_current_end AS cur_end,
      v_prev_start AS prv_start,
      v_prev_end AS prv_end
  ),
  order_base AS (
    SELECT
      o.order_id,
      o.order_name,
      o.order_date_cairo AS order_date,
      o.company_name,
      o.customer_id,
      o.customer_name,
      o.salesperson,
      o.governorate_code,
      o.area_code,
      CASE
        WHEN p_product_id IS NOT NULL THEN COALESCE(ps.subtotal, 0)
        ELSE COALESCE(o.order_value, 0)
      END AS eff_sales_val
    FROM public.sales_orders_odoo18_geo o
    LEFT JOIN public.product_sales_from_june1 ps ON ps.order_id = o.order_id AND ps.product_id = p_product_id
    WHERE o.order_date_cairo <= (SELECT cur_end FROM params)
      AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
      AND (p_governorate_code IS NULL OR o.governorate_code = p_governorate_code)
      AND (p_area_code IS NULL OR o.area_code = p_area_code)
      AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
      AND (p_product_id IS NULL OR ps.product_id IS NOT NULL)
  ),
  scoped_orders AS (
    SELECT *
    FROM order_base ob
    WHERE ob.order_date BETWEEN (SELECT prv_start FROM params) AND (SELECT cur_end FROM params)
  ),
  rep_activity AS (
    SELECT
      so.company_name,
      so.customer_id,
      so.salesperson,
      CASE
        WHEN so.order_date BETWEEN (SELECT prv_start FROM params) AND (SELECT prv_end FROM params) THEN 'PREV'
        ELSE 'CURR'
      END AS period_type,
      SUM(so.eff_sales_val) AS rep_sales,
      MAX(so.order_date) AS rep_last_date
    FROM scoped_orders so
    GROUP BY so.company_name, so.customer_id, so.salesperson,
      CASE
        WHEN so.order_date BETWEEN (SELECT prv_start FROM params) AND (SELECT prv_end FROM params) THEN 'PREV'
        ELSE 'CURR'
      END
  ),
  ranked AS (
    SELECT
      ra.company_name,
      ra.customer_id,
      ra.period_type,
      ra.salesperson,
      ROW_NUMBER() OVER (
        PARTITION BY ra.company_name, ra.customer_id, ra.period_type
        ORDER BY ra.rep_sales DESC, ra.rep_last_date DESC
      ) AS rn
    FROM rep_activity ra
  ),
  totals AS (
    SELECT
      so.company_name,
      so.customer_id,
      MAX(so.customer_name) AS customer_name,
      CASE
        WHEN so.order_date BETWEEN (SELECT prv_start FROM params) AND (SELECT prv_end FROM params) THEN 'PREV'
        ELSE 'CURR'
      END AS period_type,
      COUNT(DISTINCT so.order_id) AS orders_count,
      SUM(so.eff_sales_val) AS total_sales,
      MAX(so.order_date) AS last_order_date
    FROM scoped_orders so
    GROUP BY so.company_name, so.customer_id,
      CASE
        WHEN so.order_date BETWEEN (SELECT prv_start FROM params) AND (SELECT prv_end FROM params) THEN 'PREV'
        ELSE 'CURR'
      END
  ),
  activity AS (
    SELECT
      t.company_name,
      t.customer_id,
      t.customer_name,
      t.period_type,
      r.salesperson AS primary_salesperson,
      t.orders_count,
      t.total_sales,
      t.last_order_date
    FROM totals t
    JOIN ranked r ON r.company_name = t.company_name
                 AND r.customer_id = t.customer_id
                 AND r.period_type = t.period_type
                 AND r.rn = 1
  ),
  current_and_previous AS (
    SELECT
      COALESCE(c.company_name, p.company_name) AS company_name,
      COALESCE(c.customer_id, p.customer_id) AS customer_id,
      COALESCE(c.customer_name, p.customer_name) AS customer_name,
      p.primary_salesperson AS previous_salesperson,
      c.primary_salesperson AS current_salesperson,
      COALESCE(p.orders_count, 0) AS previous_orders,
      COALESCE(c.orders_count, 0) AS current_orders,
      COALESCE(p.total_sales, 0) AS previous_sales,
      COALESCE(c.total_sales, 0) AS current_sales,
      p.last_order_date AS previous_last_order_date,
      c.last_order_date AS current_last_order_date,
      (p.customer_id IS NOT NULL) AS is_in_prev,
      (c.customer_id IS NOT NULL) AS is_in_curr
    FROM (SELECT * FROM activity WHERE period_type = 'PREV') p
    FULL OUTER JOIN (SELECT * FROM activity WHERE period_type = 'CURR') c
      ON p.company_name = c.company_name AND p.customer_id = c.customer_id
  ),
  lost AS (
    SELECT
      cp.*,
      EXISTS (
        SELECT 1
        FROM order_base ob
        WHERE ob.company_name = cp.company_name
          AND ob.customer_id = cp.customer_id
          AND ob.order_date < (SELECT prv_start FROM params)
      ) AS has_prior_history
    FROM current_and_previous cp
  ),
  retention_rows AS (
    SELECT
      l.company_name::text AS company_name,
      l.customer_id::bigint AS customer_id,
      l.customer_name::text AS customer_name,
      l.previous_salesperson::text AS previous_salesperson,
      l.current_salesperson::text AS current_salesperson,
      l.previous_orders::bigint AS previous_orders,
      l.current_orders::bigint AS current_orders,
      l.previous_sales::numeric AS previous_sales,
      l.current_sales::numeric AS current_sales,
      CASE
        WHEN l.is_in_prev AND l.is_in_curr AND LOWER(COALESCE(l.previous_salesperson, '')) = LOWER(COALESCE(l.current_salesperson, '')) THEN 'RETAINED'::text
        WHEN l.is_in_prev AND l.is_in_curr AND LOWER(COALESCE(l.previous_salesperson, '')) <> LOWER(COALESCE(l.current_salesperson, '')) THEN 'TRANSFERRED'::text
        WHEN l.is_in_prev AND NOT l.is_in_curr THEN 'LOST'::text
        WHEN NOT l.is_in_prev AND l.is_in_curr AND l.has_prior_history THEN 'REACTIVATED'::text
        WHEN NOT l.is_in_prev AND l.is_in_curr AND NOT l.has_prior_history THEN 'NEW_IN_WINDOW'::text
        ELSE 'RETAINED'::text
      END AS retention_status,
      CASE
        WHEN l.previous_sales = 0 THEN NULL::numeric
        ELSE ((l.current_sales - l.previous_sales) / l.previous_sales * 100)::numeric
      END AS sales_change_pct,
      l.previous_last_order_date::date AS previous_last_order_date,
      l.current_last_order_date::date AS current_last_order_date
    FROM lost l
  ),
  filtered AS (
    SELECT *
    FROM retention_rows r
    WHERE (
      p_salesperson IS NULL
      OR LOWER(COALESCE(r.previous_salesperson, '')) = LOWER(p_salesperson)
      OR LOWER(COALESCE(r.current_salesperson, '')) = LOWER(p_salesperson)
    )
    AND (p_status IS NULL OR UPPER(r.retention_status) = UPPER(p_status))
  )
  SELECT
    f.company_name,
    f.customer_id,
    f.customer_name,
    f.previous_salesperson,
    f.current_salesperson,
    f.previous_orders,
    f.current_orders,
    f.previous_sales,
    f.current_sales,
    f.retention_status,
    f.sales_change_pct,
    f.previous_last_order_date,
    f.current_last_order_date
  FROM filtered f
  ORDER BY
    CASE WHEN UPPER(COALESCE(p_status, '')) = 'LOST' OR f.retention_status = 'LOST' THEN f.previous_sales ELSE f.current_sales END DESC,
    f.customer_id ASC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;


-- ==============================================================================
-- 6. analytics_customer_action_center_scoped_v2
-- Purpose: Action center, at-risk accounts, and recovery opportunities respecting full global filters.
-- Rebuilt directly from the exact CTE chain and logic of production analytics_customer_action_center:
-- base_orders -> customer_scope -> order_stats -> order_days -> gaps -> medians -> owner_months -> owners -> classified
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.analytics_customer_action_center_scoped_v2(
  p_as_of_date date DEFAULT NULL::date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_governorate_code text DEFAULT NULL::text,
  p_area_code text DEFAULT NULL::text,
  p_customer_id bigint DEFAULT NULL::bigint,
  p_product_id bigint DEFAULT NULL::bigint,
  p_priority text DEFAULT NULL::text,
  p_action_type text DEFAULT NULL::text,
  p_risk text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  customer_id bigint,
  customer_name text,
  company_name text,
  current_salesperson text,
  last_order_date date,
  days_since_last_order integer,
  median_days_between_orders numeric,
  recent_30d_sales numeric,
  previous_30d_sales numeric,
  sales_change_pct numeric,
  recovery_opportunity numeric,
  risk_level text,
  action_type text,
  priority text,
  action_reason text,
  salesperson_changed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_as_of date;
  v_recent_start date;
  v_prev_start date;
  v_prev_end date;
  v_cur_month_start date;
  v_prev_month_start date;
  v_prev_month_end date;
  v_limit integer;
  v_offset integer;
BEGIN
  v_as_of := COALESCE(p_as_of_date, CURRENT_DATE);
  v_recent_start := v_as_of - 29;
  v_prev_start := v_as_of - 59;
  v_prev_end := v_as_of - 30;

  v_cur_month_start := date_trunc('month', v_as_of)::date;
  v_prev_month_start := (date_trunc('month', v_as_of) - interval '1 month')::date;
  v_prev_month_end := (date_trunc('month', v_as_of) - interval '1 day')::date;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  WITH base_orders AS (
    SELECT
      o.order_id,
      o.order_date_cairo,
      o.customer_id,
      o.customer_name,
      o.company_name,
      o.salesperson,
      CASE
        WHEN p_product_id IS NOT NULL THEN COALESCE(ps.subtotal, 0)
        ELSE COALESCE(o.order_value, 0)
      END AS eff_sales_val
    FROM public.sales_orders_odoo18_geo o
    LEFT JOIN public.product_sales_from_june1 ps ON ps.order_id = o.order_id AND ps.product_id = p_product_id
    WHERE o.order_date_cairo <= v_as_of
      AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
      AND (p_governorate_code IS NULL OR o.governorate_code = p_governorate_code)
      AND (p_area_code IS NULL OR o.area_code = p_area_code)
      AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
      AND (p_product_id IS NULL OR ps.product_id IS NOT NULL)
  ),
  customer_scope AS (
    SELECT
      b.company_name,
      b.customer_id,
      MAX(b.customer_name) AS customer_name,
      MAX(b.order_date_cairo) AS last_order_date,
      (v_as_of - MAX(b.order_date_cairo))::integer AS days_since_last_order,
      SUM(CASE WHEN b.order_date_cairo BETWEEN v_recent_start AND v_as_of THEN b.eff_sales_val ELSE 0 END) AS recent_30d_sales,
      SUM(CASE WHEN b.order_date_cairo BETWEEN v_prev_start AND v_prev_end THEN b.eff_sales_val ELSE 0 END) AS previous_30d_sales
    FROM base_orders b
    GROUP BY b.company_name, b.customer_id
  ),
  order_days AS (
    SELECT DISTINCT
      b.company_name,
      b.customer_id,
      b.order_date_cairo
    FROM base_orders b
  ),
  gaps AS (
    SELECT
      od.company_name,
      od.customer_id,
      (od.order_date_cairo - LAG(od.order_date_cairo) OVER (PARTITION BY od.company_name, od.customer_id ORDER BY od.order_date_cairo))::integer AS gap_days
    FROM order_days od
  ),
  medians AS (
    SELECT
      g.company_name,
      g.customer_id,
      ROUND(COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY g.gap_days), 0)::numeric, 2) AS median_days_between_orders
    FROM gaps g
    WHERE g.gap_days IS NOT NULL
    GROUP BY g.company_name, g.customer_id
  ),
  owner_months AS (
    SELECT
      b.company_name,
      b.customer_id,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) FILTER (
        WHERE b.order_date_cairo BETWEEN v_cur_month_start AND v_as_of
      ) AS current_month_owner,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) FILTER (
        WHERE b.order_date_cairo BETWEEN v_prev_month_start AND v_prev_month_end
      ) AS prev_month_owner,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) AS all_time_owner
    FROM base_orders b
    GROUP BY b.company_name, b.customer_id
  ),
  owners AS (
    SELECT
      om.company_name,
      om.customer_id,
      COALESCE(om.current_month_owner, om.all_time_owner, '')::text AS current_salesperson,
      om.prev_month_owner::text AS previous_salesperson
    FROM owner_months om
  ),
  classified AS (
    SELECT
      cs.customer_id::bigint AS customer_id,
      cs.customer_name::text AS customer_name,
      cs.company_name::text AS company_name,
      o.current_salesperson::text AS current_salesperson,
      cs.last_order_date::date AS last_order_date,
      cs.days_since_last_order::integer AS days_since_last_order,
      COALESCE(m.median_days_between_orders, 0)::numeric AS median_days_between_orders,
      cs.recent_30d_sales::numeric AS recent_30d_sales,
      cs.previous_30d_sales::numeric AS previous_30d_sales,
      CASE
        WHEN cs.previous_30d_sales = 0 THEN NULL::numeric
        ELSE ((cs.recent_30d_sales - cs.previous_30d_sales) / cs.previous_30d_sales * 100)::numeric
      END AS sales_change_pct,
      CASE
        WHEN cs.previous_30d_sales > cs.recent_30d_sales THEN (cs.previous_30d_sales - cs.recent_30d_sales)::numeric
        ELSE 0::numeric
      END AS recovery_opportunity,
      -- Production risk_level: LOST, HIGH, MEDIUM, LOW
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'LOST'::text
        WHEN cs.days_since_last_order > 60 OR (cs.previous_30d_sales > 0 AND cs.recent_30d_sales <= cs.previous_30d_sales * 0.5) THEN 'HIGH'::text
        WHEN cs.days_since_last_order > 30 OR (cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7) THEN 'MEDIUM'::text
        ELSE 'LOW'::text
      END AS risk_level,
      -- Production action_type order
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'REACTIVATE_LOST'::text
        WHEN cs.days_since_last_order > 30 THEN 'WIN_BACK'::text
        WHEN cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7 THEN 'RECOVER_DECLINE'::text
        WHEN COALESCE(m.median_days_between_orders, 0) > 0
             AND cs.days_since_last_order > GREATEST(7, CEIL(COALESCE(m.median_days_between_orders, 0) * 2))
          THEN 'OVERDUE_FOLLOWUP'::text
        WHEN (o.previous_salesperson IS NOT NULL AND o.current_salesperson IS NOT NULL AND LOWER(o.previous_salesperson) <> LOWER(o.current_salesperson)) THEN 'OWNER_TRANSFER_REVIEW'::text
        ELSE 'MONITOR'::text
      END AS action_type,
      -- Production priority: HIGH, MEDIUM, LOW
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'HIGH'::text
        WHEN cs.days_since_last_order > 60 THEN 'HIGH'::text
        WHEN (CASE WHEN cs.previous_30d_sales > cs.recent_30d_sales THEN (cs.previous_30d_sales - cs.recent_30d_sales) ELSE 0 END) >= 100000 THEN 'HIGH'::text
        WHEN cs.days_since_last_order > 30 THEN 'MEDIUM'::text
        WHEN (CASE WHEN cs.previous_30d_sales > cs.recent_30d_sales THEN (cs.previous_30d_sales - cs.recent_30d_sales) ELSE 0 END) >= 25000 THEN 'MEDIUM'::text
        WHEN COALESCE(m.median_days_between_orders, 0) > 0
             AND cs.days_since_last_order > GREATEST(7, CEIL(COALESCE(m.median_days_between_orders, 0) * 2))
          THEN 'MEDIUM'::text
        ELSE 'LOW'::text
      END AS priority,
      -- Production action_reason
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'عميل متوقف عن الشراء لأكثر من 120 يوما'::text
        WHEN cs.days_since_last_order > 30 THEN 'عميل متوقف عن الشراء لأكثر من 30 يوما'::text
        WHEN cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7 THEN 'انخفاض في المبيعات مقارنة بالفترة السابقة'::text
        WHEN COALESCE(m.median_days_between_orders, 0) > 0
             AND cs.days_since_last_order > GREATEST(7, CEIL(COALESCE(m.median_days_between_orders, 0) * 2))
          THEN 'تأخر في الشراء عن الدورة المعتادة'::text
        WHEN (o.previous_salesperson IS NOT NULL AND o.current_salesperson IS NOT NULL AND LOWER(o.previous_salesperson) <> LOWER(o.current_salesperson)) THEN 'تغيير في مسؤول المبيعات يتطلب متابعة'::text
        ELSE 'أداء مستقر - استمرار المتابعة الدورية'::text
      END AS action_reason,
      (o.previous_salesperson IS NOT NULL AND o.current_salesperson IS NOT NULL AND LOWER(o.previous_salesperson) <> LOWER(o.current_salesperson)) AS salesperson_changed
    FROM customer_scope cs
    LEFT JOIN medians m ON m.company_name = cs.company_name AND m.customer_id = cs.customer_id
    JOIN owners o ON o.company_name = cs.company_name AND o.customer_id = cs.customer_id
  )
  SELECT
    c.customer_id,
    c.customer_name,
    c.company_name,
    c.current_salesperson,
    c.last_order_date,
    c.days_since_last_order,
    c.median_days_between_orders,
    c.recent_30d_sales,
    c.previous_30d_sales,
    c.sales_change_pct,
    c.recovery_opportunity,
    c.risk_level,
    c.action_type,
    c.priority,
    c.action_reason,
    c.salesperson_changed
  FROM classified c
  WHERE (p_salesperson IS NULL OR LOWER(c.current_salesperson) = LOWER(p_salesperson))
    AND (p_priority IS NULL OR UPPER(c.priority) = UPPER(p_priority))
    AND (p_action_type IS NULL OR UPPER(c.action_type) = UPPER(p_action_type))
    AND (p_risk IS NULL OR UPPER(c.risk_level) = UPPER(p_risk))
    AND (p_search IS NULL OR c.customer_name ILIKE '%' || p_search || '%')
  ORDER BY c.recovery_opportunity DESC, c.days_since_last_order DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;
