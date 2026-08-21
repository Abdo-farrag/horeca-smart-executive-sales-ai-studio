-- ==============================================================================
-- MIGRATION: 20260820000000_customer_action_center_freshness_fix.sql
-- PURPOSE: Fix dynamic data freshness default and cross-company customer aggregation grain
--          for Customer Action Center, Action Center Scoped v2, and Recovery Opportunities.
--
-- BUSINESS RULES PRESERVED:
-- 1. Dynamic As-Of Date: When p_as_of_date IS NULL, defaults to MAX(order_date_cairo)
--    from confirmed sales orders rather than CURRENT_DATE.
-- 2. Explicit As-Of Date: Explicitly provided p_as_of_date is strictly respected.
-- 3. Enterprise Scope Grain: When p_company_name IS NULL, customer activity is evaluated
--    at enterprise customer grain (grouped by customer_id, company_name = 'All') so that
--    recent purchases in any operating company prevent stale ghost actions.
-- 4. Single-Company Scope: When p_company_name IS NOT NULL, evaluates orders strictly
--    for the specified company.
-- 5. Exact Risk, Priority, and Action Classifications Preserved.
-- ==============================================================================

-- 1. analytics_customer_action_center
CREATE OR REPLACE FUNCTION public.analytics_customer_action_center(
  p_as_of_date date DEFAULT NULL::date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_priority text DEFAULT NULL::text,
  p_action_type text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT NULL::integer,
  p_offset integer DEFAULT NULL::integer
)
RETURNS TABLE(
  customer_id integer,
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
  -- 1. Dynamic Data Freshness Default
  v_as_of := COALESCE(p_as_of_date, (SELECT MAX(order_date_cairo) FROM public.sales_orders_odoo18));
  
  v_recent_start := v_as_of - 29;
  v_prev_start := v_as_of - 59;
  v_prev_end := v_as_of - 30;
  v_cur_month_start := date_trunc('month', v_as_of)::date;
  v_prev_month_start := (date_trunc('month', v_as_of) - interval '1 month')::date;
  v_prev_month_end := (date_trunc('month', v_as_of) - interval '1 day')::date;
  v_limit := p_limit;
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
      COALESCE(o.order_value, 0)::numeric AS order_value
    FROM public.sales_orders_odoo18 o
    WHERE o.order_date_cairo <= v_as_of
      AND (p_company_name IS NULL OR LOWER(o.company_name) = LOWER(p_company_name))
  ),
  customer_scope AS (
    SELECT
      CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END AS company_name,
      b.customer_id,
      MAX(b.customer_name) AS customer_name,
      MAX(b.order_date_cairo) AS last_order_date,
      (v_as_of - MAX(b.order_date_cairo))::integer AS days_since_last_order,
      SUM(CASE WHEN b.order_date_cairo BETWEEN v_recent_start AND v_as_of THEN b.order_value ELSE 0 END)::numeric AS recent_30d_sales,
      SUM(CASE WHEN b.order_date_cairo BETWEEN v_prev_start AND v_prev_end THEN b.order_value ELSE 0 END)::numeric AS previous_30d_sales
    FROM base_orders b
    GROUP BY (CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END), b.customer_id
  ),
  order_days AS (
    SELECT DISTINCT
      CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END AS company_name,
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
      CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END AS company_name,
      b.customer_id,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) FILTER (
        WHERE b.order_date_cairo BETWEEN v_cur_month_start AND v_as_of
      ) AS current_month_owner,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) FILTER (
        WHERE b.order_date_cairo BETWEEN v_prev_month_start AND v_prev_month_end
      ) AS prev_month_owner,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) AS all_time_owner
    FROM base_orders b
    GROUP BY (CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END), b.customer_id
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
      cs.customer_id::integer AS customer_id,
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
        ELSE ROUND(((cs.recent_30d_sales - cs.previous_30d_sales) / cs.previous_30d_sales * 100)::numeric, 2)
      END AS sales_change_pct,
      CASE
        WHEN cs.previous_30d_sales > cs.recent_30d_sales THEN (cs.previous_30d_sales - cs.recent_30d_sales)::numeric
        ELSE 0::numeric
      END AS recovery_opportunity,
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'LOST'::text
        WHEN cs.days_since_last_order > 60 OR (cs.previous_30d_sales > 0 AND cs.recent_30d_sales <= cs.previous_30d_sales * 0.5) THEN 'HIGH'::text
        WHEN cs.days_since_last_order > 30 OR (cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7) THEN 'MEDIUM'::text
        ELSE 'LOW'::text
      END AS risk_level,
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
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'العميل متوقف عن الشراء لأكثر من 120 يومًا'::text
        WHEN cs.days_since_last_order > 30 THEN 'العميل لم يطلب منذ أكثر من 30 يومًا'::text
        WHEN cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7 THEN 'مبيعات آخر 30 يومًا انخفضت بأكثر من 30%'::text
        WHEN COALESCE(m.median_days_between_orders, 0) > 0
             AND cs.days_since_last_order > GREATEST(7, CEIL(COALESCE(m.median_days_between_orders, 0) * 2))
          THEN 'العميل متأخر عن نمط الشراء المعتاد'::text
        WHEN (o.previous_salesperson IS NOT NULL AND o.current_salesperson IS NOT NULL AND LOWER(o.previous_salesperson) <> LOWER(o.current_salesperson)) THEN 'تم تغيير المندوب الأساسي مقارنة بالشهر السابق'::text
        ELSE 'لا توجد إشارة تدخل عاجلة'::text
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
    AND (p_search IS NULL OR c.customer_name ILIKE '%' || p_search || '%' OR c.customer_id::text ILIKE '%' || p_search || '%')
  ORDER BY
    CASE c.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
    c.recovery_opportunity DESC,
    c.days_since_last_order DESC,
    c.customer_name
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

-- 2. analytics_customer_action_center_v2
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
BEGIN
  RETURN QUERY
  SELECT
    ac.customer_id,
    ac.customer_name,
    ac.company_name,
    ac.current_salesperson,
    ac.last_order_date,
    ac.days_since_last_order,
    ac.median_days_between_orders,
    ac.recent_30d_sales,
    ac.previous_30d_sales,
    ac.sales_change_pct,
    ac.recovery_opportunity,
    ac.risk_level,
    ac.action_type,
    ac.priority,
    ac.action_reason,
    ac.salesperson_changed
  FROM public.analytics_customer_action_center(
    p_as_of_date := p_as_of_date,
    p_company_name := p_company_name,
    p_salesperson := p_salesperson,
    p_priority := p_priority,
    p_action_type := p_action_type,
    p_search := p_search,
    p_limit := p_limit,
    p_offset := p_offset
  ) ac
  WHERE (p_risk IS NULL OR LOWER(ac.risk_level) = LOWER(p_risk));
END;
$$;

-- 3. analytics_customer_recovery_opportunities
CREATE OR REPLACE FUNCTION public.analytics_customer_recovery_opportunities(
  p_as_of_date date DEFAULT NULL::date,
  p_company_name text DEFAULT NULL::text,
  p_salesperson text DEFAULT NULL::text,
  p_limit integer DEFAULT NULL::integer
)
RETURNS TABLE(
  customer_id integer,
  customer_name text,
  company_name text,
  current_salesperson text,
  action_type text,
  priority text,
  recovery_opportunity numeric,
  recent_30d_sales numeric,
  previous_30d_sales numeric,
  sales_change_pct numeric,
  days_since_last_order integer,
  action_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.customer_id,
    ac.customer_name,
    ac.company_name,
    ac.current_salesperson,
    ac.action_type,
    ac.priority,
    ac.recovery_opportunity,
    ac.recent_30d_sales,
    ac.previous_30d_sales,
    ac.sales_change_pct,
    ac.days_since_last_order,
    ac.action_reason
  FROM public.analytics_customer_action_center(
    p_as_of_date := p_as_of_date,
    p_company_name := p_company_name,
    p_salesperson := p_salesperson,
    p_priority := NULL,
    p_action_type := NULL,
    p_search := NULL,
    p_limit := NULL,
    p_offset := NULL
  ) ac
  WHERE ac.recovery_opportunity > 0
    AND ac.action_type IN ('RECOVER_DECLINE', 'WIN_BACK', 'REACTIVATE_LOST')
  ORDER BY ac.recovery_opportunity DESC
  LIMIT p_limit;
END;
$$;

-- 4. analytics_customer_action_center_scoped_v2
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
  -- 1. Dynamic Data Freshness Default
  v_as_of := COALESCE(
    p_as_of_date,
    (SELECT MAX(order_date_cairo) FROM public.sales_orders_odoo18_geo),
    (SELECT MAX(order_date_cairo) FROM public.sales_orders_odoo18)
  );
  
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
      CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END AS company_name,
      b.customer_id,
      MAX(b.customer_name) AS customer_name,
      MAX(b.order_date_cairo) AS last_order_date,
      (v_as_of - MAX(b.order_date_cairo))::integer AS days_since_last_order,
      SUM(CASE WHEN b.order_date_cairo BETWEEN v_recent_start AND v_as_of THEN b.eff_sales_val ELSE 0 END)::numeric AS recent_30d_sales,
      SUM(CASE WHEN b.order_date_cairo BETWEEN v_prev_start AND v_prev_end THEN b.eff_sales_val ELSE 0 END)::numeric AS previous_30d_sales
    FROM base_orders b
    GROUP BY (CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END), b.customer_id
  ),
  order_days AS (
    SELECT DISTINCT
      CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END AS company_name,
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
      CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END AS company_name,
      b.customer_id,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) FILTER (
        WHERE b.order_date_cairo BETWEEN v_cur_month_start AND v_as_of
      ) AS current_month_owner,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) FILTER (
        WHERE b.order_date_cairo BETWEEN v_prev_month_start AND v_prev_month_end
      ) AS prev_month_owner,
      MODE() WITHIN GROUP (ORDER BY b.salesperson) AS all_time_owner
    FROM base_orders b
    GROUP BY (CASE WHEN p_company_name IS NOT NULL THEN b.company_name ELSE 'All' END), b.customer_id
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
        ELSE ROUND(((cs.recent_30d_sales - cs.previous_30d_sales) / cs.previous_30d_sales * 100)::numeric, 2)
      END AS sales_change_pct,
      CASE
        WHEN cs.previous_30d_sales > cs.recent_30d_sales THEN (cs.previous_30d_sales - cs.recent_30d_sales)::numeric
        ELSE 0::numeric
      END AS recovery_opportunity,
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'LOST'::text
        WHEN cs.days_since_last_order > 60 OR (cs.previous_30d_sales > 0 AND cs.recent_30d_sales <= cs.previous_30d_sales * 0.5) THEN 'HIGH'::text
        WHEN cs.days_since_last_order > 30 OR (cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7) THEN 'MEDIUM'::text
        ELSE 'LOW'::text
      END AS risk_level,
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
      CASE
        WHEN cs.days_since_last_order > 120 THEN 'العميل متوقف عن الشراء لأكثر من 120 يومًا'::text
        WHEN cs.days_since_last_order > 30 THEN 'العميل لم يطلب منذ أكثر من 30 يومًا'::text
        WHEN cs.previous_30d_sales > 0 AND cs.recent_30d_sales < cs.previous_30d_sales * 0.7 THEN 'مبيعات آخر 30 يومًا انخفضت بأكثر من 30%'::text
        WHEN COALESCE(m.median_days_between_orders, 0) > 0
             AND cs.days_since_last_order > GREATEST(7, CEIL(COALESCE(m.median_days_between_orders, 0) * 2))
          THEN 'العميل متأخر عن نمط الشراء المعتاد'::text
        WHEN (o.previous_salesperson IS NOT NULL AND o.current_salesperson IS NOT NULL AND LOWER(o.previous_salesperson) <> LOWER(o.current_salesperson)) THEN 'تم تغيير المندوب الأساسي مقارنة بالشهر السابق'::text
        ELSE 'لا توجد إشارة تدخل عاجلة'::text
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
    AND (p_search IS NULL OR c.customer_name ILIKE '%' || p_search || '%' OR c.customer_id::text ILIKE '%' || p_search || '%')
  ORDER BY
    CASE c.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
    c.recovery_opportunity DESC,
    c.days_since_last_order DESC,
    c.customer_name
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

-- GRANTS
GRANT EXECUTE ON FUNCTION public.analytics_customer_action_center(date, text, text, text, text, text, integer, integer) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.analytics_customer_action_center_v2(date, text, text, text, text, text, integer, integer, text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.analytics_customer_recovery_opportunities(date, text, text, integer) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.analytics_customer_action_center_scoped_v2(date, text, text, text, text, bigint, bigint, text, text, text, text, integer, integer) TO authenticated, service_role, anon;
