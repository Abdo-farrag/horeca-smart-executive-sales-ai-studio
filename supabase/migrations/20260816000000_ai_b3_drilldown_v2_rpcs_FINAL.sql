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
-- Exact row-level companion to analytics_customer_retention_summary_v2.
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
with params as (
  select date_trunc('month',p_month)::date cm,
         (date_trunc('month',p_month)-interval '1 month')::date pm,
         (date_trunc('month',p_month)+interval '1 month'-interval '1 day')::date cm_end
), order_base as (
  select p.order_id,
         (max(p.order_date) at time zone 'Africa/Cairo')::date order_date_cairo,
         max(p.company_id)::bigint company_id,
         max(p.company_name)::text company_name,
         max(p.customer_id)::bigint customer_id,
         max(p.customer_name)::text customer_name,
         coalesce(nullif(btrim(max(p.salesperson)),''),'Unassigned')::text salesperson,
         case when p_product_id is null
              then sum(p.subtotal)
              else sum(p.subtotal) filter (where p.product_id=p_product_id)
         end::numeric sales_value,
         bool_or(p.product_id=p_product_id) has_product
  from public.product_sales_from_june1 p
  cross join params x
  where p.order_date >= '2026-05-31 21:00:00+00'::timestamptz
    and p.order_date < ((x.cm_end + 1)::timestamp at time zone 'Africa/Cairo')
    and p.state='sale'
    and p.company_id = any(array[1::bigint,2::bigint])
    and (p.order_name like 'HS%' or p.order_name like 'MS%')
    and (p_company_name is null or p.company_name=p_company_name)
    and (p_customer_id is null or p.customer_id=p_customer_id)
    and not exists (
      select 1 from public.procurement_intercompany_customer_exclusions e
      where e.is_active=true
        and e.company_id=p.company_id
        and e.normalized_customer_name=lower(btrim(p.customer_name))
    )
  group by p.order_id
  having p_product_id is null or bool_or(p.product_id=p_product_id)
), scoped_orders as (
  select o.*
  from order_base o
  left join public.customer_geography_odoo18 g on g.customer_id=o.customer_id
  where (p_governorate_code is null or g.governorate_code=p_governorate_code)
    and (p_area_code is null or g.area_code=p_area_code)
), rep_activity as (
 select date_trunc('month',order_date_cairo)::date order_month,company_id,max(company_name) company_name,customer_id,max(customer_name) customer_name,
        salesperson,count(*)::int orders_count,sum(sales_value)::numeric sales_value,max(order_date_cairo)::date last_order_date
 from scoped_orders
 group by date_trunc('month',order_date_cairo)::date,company_id,customer_id,salesperson
), ranked as (
 select r.*,row_number() over(partition by r.order_month,r.company_id,r.customer_id order by r.sales_value desc,r.orders_count desc,r.salesperson) rep_rank
 from rep_activity r
), totals as (
 select order_month,company_id,max(company_name) company_name,customer_id,max(customer_name) customer_name,
        sum(orders_count)::bigint orders_count,sum(sales_value)::numeric sales_value,max(last_order_date)::date last_order_date
 from rep_activity group by order_month,company_id,customer_id
), activity as (
 select t.order_month,t.company_id,t.company_name,t.customer_id,t.customer_name,r.salesperson primary_salesperson,
        t.orders_count,t.sales_value,t.last_order_date
 from totals t join ranked r on r.order_month=t.order_month and r.company_id=t.company_id and r.customer_id=t.customer_id and r.rep_rank=1
), current_and_previous as (
 select x.cm current_month,c.company_id,c.company_name,c.customer_id,c.customer_name,p.primary_salesperson previous_salesperson,
        c.primary_salesperson current_salesperson,coalesce(p.orders_count,0)::bigint previous_orders,c.orders_count::bigint current_orders,
        coalesce(p.sales_value,0)::numeric previous_sales,c.sales_value::numeric current_sales,
        p.last_order_date::date previous_last_order_date,c.last_order_date::date current_last_order_date,
        case when p.customer_id is not null and p.primary_salesperson is distinct from c.primary_salesperson then 'TRANSFERRED'
             when p.customer_id is not null then 'RETAINED'
             when exists(select 1 from activity h where h.company_id=c.company_id and h.customer_id=c.customer_id and h.order_month<x.pm) then 'REACTIVATED'
             else 'NEW_IN_WINDOW' end retention_status
 from params x join activity c on c.order_month=x.cm
 left join activity p on p.order_month=x.pm and p.company_id=c.company_id and p.customer_id=c.customer_id
), lost as (
 select x.cm,p.company_id,p.company_name,p.customer_id,p.customer_name,p.primary_salesperson,null::text,
        p.orders_count::bigint,0::bigint,p.sales_value::numeric,0::numeric,
        p.last_order_date::date,null::date,'LOST'::text
 from params x join activity p on p.order_month=x.pm
 left join activity c on c.order_month=x.cm and c.company_id=p.company_id and c.customer_id=p.customer_id
 where c.customer_id is null
), retention_rows as (
 select * from current_and_previous union all select * from lost
), filtered as (
 select * from retention_rows r
 where (p_salesperson is null or r.previous_salesperson=p_salesperson or r.current_salesperson=p_salesperson)
   and (p_status is null or upper(r.retention_status)=upper(p_status))
)
select f.company_name::text, f.customer_id::bigint, f.customer_name::text,
       f.previous_salesperson::text, f.current_salesperson::text,
       f.previous_orders::bigint, f.current_orders::bigint,
       f.previous_sales::numeric, f.current_sales::numeric, f.retention_status::text,
       case when f.previous_sales=0 then null::numeric
            else round(((f.current_sales-f.previous_sales)/f.previous_sales*100)::numeric,2) end as sales_change_pct,
       f.previous_last_order_date::date, f.current_last_order_date::date
from filtered f
order by case when f.retention_status='LOST' then f.previous_sales else f.current_sales end desc, f.customer_id
limit least(greatest(coalesce(p_limit,20),1),20)
offset greatest(coalesce(p_offset,0),0);
$function$;

-- ==============================================================================
-- 6. analytics_customer_action_center_scoped_v2
-- Production-equivalent action-center semantics with additional geo/customer/product scope.
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
  customer_id bigint, customer_name text, company_name text, current_salesperson text,
  last_order_date date, days_since_last_order integer, median_days_between_orders numeric,
  recent_30d_sales numeric, previous_30d_sales numeric, sales_change_pct numeric,
  recovery_opportunity numeric, risk_level text, action_type text, priority text,
  action_reason text, salesperson_changed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
with params as (select coalesce(p_as_of_date,current_date)::date as as_of_date),
product_order_sales as (
  select l.order_id, sum(l.subtotal)::numeric product_sales
  from public.product_sales_from_june1 l
  where p_product_id is not null and l.product_id=p_product_id
  group by l.order_id
),
base_orders as (
  select o.order_id,o.order_date_cairo,o.customer_id,o.customer_name,o.company_name,o.salesperson,
         case when p_product_id is null then o.order_value else pos.product_sales end::numeric order_value
  from public.sales_orders_odoo18_geo o
  cross join params p
  left join product_order_sales pos on pos.order_id=o.order_id
  where o.order_date_cairo <= p.as_of_date
    and (p_company_name is null or o.company_name=p_company_name)
    and (p_governorate_code is null or o.governorate_code=p_governorate_code)
    and (p_area_code is null or o.area_code=p_area_code)
    and (p_customer_id is null or o.customer_id=p_customer_id)
    and (p_product_id is null or pos.order_id is not null)
),
customer_scope as (
  select distinct customer_id,customer_name,company_name from base_orders
),
order_stats as (
  select b.customer_id,b.company_name,max(b.customer_name) customer_name,max(b.order_date_cairo) last_order_date,
         (p.as_of_date-max(b.order_date_cairo))::int days_since_last_order,
         sum(b.order_value) filter(where b.order_date_cairo between p.as_of_date-29 and p.as_of_date) recent_30d_sales,
         sum(b.order_value) filter(where b.order_date_cairo between p.as_of_date-59 and p.as_of_date-30) previous_30d_sales,
         mode() within group(order by b.salesperson) filter(where b.order_date_cairo between p.as_of_date-29 and p.as_of_date) current_salesperson
  from base_orders b cross join params p
  group by b.customer_id,b.company_name,p.as_of_date
),
order_days as (
  select distinct customer_id,company_name,order_date_cairo from base_orders
),
gaps as (
  select customer_id,company_name,order_date_cairo-lag(order_date_cairo) over(partition by customer_id,company_name order by order_date_cairo) gap_days
  from order_days
),
medians as (
  select customer_id,company_name,
         percentile_cont(0.5) within group(order by gap_days) filter(where gap_days is not null) median_days_between_orders
  from gaps group by customer_id,company_name
),
owner_months as (
  select b.customer_id,b.company_name,date_trunc('month',b.order_date_cairo)::date month_start,
         mode() within group(order by b.salesperson) owner
  from base_orders b cross join params p
  where b.order_date_cairo >= date_trunc('month',p.as_of_date-interval '1 month')::date
  group by b.customer_id,b.company_name,date_trunc('month',b.order_date_cairo)::date
),
owners as (
  select om.customer_id,om.company_name,
         max(om.owner) filter(where om.month_start=date_trunc('month',p.as_of_date)::date) current_owner,
         max(om.owner) filter(where om.month_start=date_trunc('month',p.as_of_date-interval '1 month')::date) previous_owner
  from owner_months om cross join params p
  group by om.customer_id,om.company_name
),
classified as (
  select s.customer_id,s.customer_name,s.company_name,
         coalesce(s.current_salesperson,o.current_owner,o.previous_owner) current_salesperson,
         s.last_order_date,s.days_since_last_order,round(coalesce(m.median_days_between_orders,0)::numeric,2) median_days_between_orders,
         coalesce(s.recent_30d_sales,0)::numeric recent_30d_sales,
         coalesce(s.previous_30d_sales,0)::numeric previous_30d_sales,
         case when coalesce(s.previous_30d_sales,0)=0 then null
              else round(((coalesce(s.recent_30d_sales,0)-s.previous_30d_sales)/s.previous_30d_sales*100)::numeric,2) end sales_change_pct,
         greatest(coalesce(s.previous_30d_sales,0)-coalesce(s.recent_30d_sales,0),0)::numeric recovery_opportunity,
         case when s.days_since_last_order>120 then 'LOST'
              when s.days_since_last_order>60 then 'HIGH'
              when s.days_since_last_order>30 then 'MEDIUM'
              when coalesce(s.previous_30d_sales,0)>0 and coalesce(s.recent_30d_sales,0)<=s.previous_30d_sales*0.5 then 'HIGH'
              when coalesce(s.previous_30d_sales,0)>0 and coalesce(s.recent_30d_sales,0)<s.previous_30d_sales*0.7 then 'MEDIUM'
              else 'LOW' end risk_level,
         case when s.days_since_last_order>120 then 'REACTIVATE_LOST'
              when s.days_since_last_order>30 then 'WIN_BACK'
              when coalesce(s.previous_30d_sales,0)>0 and coalesce(s.recent_30d_sales,0)<s.previous_30d_sales*0.7 then 'RECOVER_DECLINE'
              when coalesce(m.median_days_between_orders,0)>0 and s.days_since_last_order>greatest(7,ceil(m.median_days_between_orders*2)) then 'OVERDUE_FOLLOWUP'
              when o.previous_owner is not null and o.current_owner is not null and o.previous_owner<>o.current_owner then 'OWNER_TRANSFER_REVIEW'
              else 'MONITOR' end action_type,
         case when s.days_since_last_order>120 then 'HIGH'
              when s.days_since_last_order>60 then 'HIGH'
              when greatest(coalesce(s.previous_30d_sales,0)-coalesce(s.recent_30d_sales,0),0)>=100000 then 'HIGH'
              when s.days_since_last_order>30 then 'MEDIUM'
              when greatest(coalesce(s.previous_30d_sales,0)-coalesce(s.recent_30d_sales,0),0)>=25000 then 'MEDIUM'
              when coalesce(m.median_days_between_orders,0)>0 and s.days_since_last_order>greatest(7,ceil(m.median_days_between_orders*2)) then 'MEDIUM'
              else 'LOW' end priority,
         case when s.days_since_last_order>120 then 'العميل متوقف عن الشراء لأكثر من 120 يومًا'
              when s.days_since_last_order>30 then 'العميل لم يطلب منذ أكثر من 30 يومًا'
              when coalesce(s.previous_30d_sales,0)>0 and coalesce(s.recent_30d_sales,0)<s.previous_30d_sales*0.7 then 'مبيعات آخر 30 يومًا انخفضت بأكثر من 30%'
              when coalesce(m.median_days_between_orders,0)>0 and s.days_since_last_order>greatest(7,ceil(m.median_days_between_orders*2)) then 'العميل متأخر عن نمط الشراء المعتاد'
              when o.previous_owner is not null and o.current_owner is not null and o.previous_owner<>o.current_owner then 'تم تغيير المندوب الأساسي مقارنة بالشهر السابق'
              else 'لا توجد إشارة تدخل عاجلة' end action_reason,
         (o.previous_owner is not null and o.current_owner is not null and o.previous_owner<>o.current_owner) salesperson_changed
  from order_stats s
  left join medians m using(customer_id,company_name)
  left join owners o using(customer_id,company_name)
)
select c.*
from classified c
where (p_salesperson is null or c.current_salesperson=p_salesperson)
  and (p_action_type is null or c.action_type=p_action_type)
  and (p_priority is null or c.priority=p_priority)
  and (p_risk is null or upper(c.risk_level)=upper(p_risk))
  and (p_search is null or c.customer_name ilike '%'||p_search||'%' or c.customer_id::text ilike '%'||p_search||'%')
order by case c.priority when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end,
         c.recovery_opportunity desc,c.days_since_last_order desc,c.customer_name
limit least(greatest(coalesce(p_limit,20),1),20)
offset greatest(coalesce(p_offset,0),0);
$function$;
