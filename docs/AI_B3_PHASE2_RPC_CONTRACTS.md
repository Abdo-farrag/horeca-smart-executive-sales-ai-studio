# EXECUTIVE AI B3 — PHASE 2 RPC CONTRACTS & SPECIFICATIONS

## 1. Overview
This document defines the interface, parameters, revenue semantics, null semantics, security constraints, and reconciliation contracts for the six B3 analytical drill-down RPCs powering Executive AI Drill-Downs.

---

## 2. Global Data & Security Rules
- **Official Order Source**: `public.sales_orders_odoo18_geo`
  - Order Date: `order_date_cairo`
  - Order Revenue: `order_value`
- **Product Sales Source**: `public.product_sales_from_june1`
  - **MANDATORY JOIN**: `product_sales_from_june1.order_id = sales_orders_odoo18_geo.order_id`
  - Never aggregate `product_sales_from_june1` independently without joining confirmed orders.
- **Security & Privacy**:
  - No PII (phone, mobile, email, street, address) is returned by any RPC.
  - No banking, payment references, cards, IBAN, Swift, Instapay, Fawry, or individual receipt transaction data is returned.
  - Functions use `SECURITY DEFINER` with explicit `SET search_path = public`.
- **Null Semantics**:
  - Additive aggregates defaults to `0` (e.g. 0 orders, 0 sales).
  - Derived or unavailable rates/percentages (e.g. dividing by zero previous sales or total sales) are strictly `NULL`, never converted to `0%`.
- **Limit Constraints**:
  - Limit clamped to `1..20` on all RPCs.

---

## 3. Detailed RPC Specifications

### RPC #1: `analytics_customer_orders_v2`
- **Signature**:
  ```sql
  analytics_customer_orders_v2(
    p_customer_id bigint,
    p_start_date date,
    p_end_date date,
    p_company_name text default null,
    p_salesperson text default null,
    p_governorate_code text default null,
    p_area_code text default null,
    p_product_id bigint default null,
    p_limit integer default 10,
    p_offset integer default 0
  )
  ```
- **Returns**:
  - `order_id` (bigint)
  - `order_name` (text)
  - `order_date` (date)
  - `company_name` (text)
  - `salesperson` (text)
  - `governorate_name` (text)
  - `area_name` (text)
  - `order_value` (numeric) — Full official order value
  - `lines_count` (integer)
  - `products_count` (integer)
  - `total_qty` (numeric)
  - `order_status` (text) — Constant `'CONFIRMED'`
- **Semantics**:
  - If `p_product_id` is provided, returns confirmed orders that contain this product (via `EXISTS` on joined lines), but `order_value` remains the full official order value.

---

### RPC #2: `analytics_customer_product_dropoff_v2`
- **Signature**:
  ```sql
  analytics_customer_product_dropoff_v2(
    p_customer_id bigint,
    p_start_date date,
    p_end_date date,
    p_company_name text default null,
    p_salesperson text default null,
    p_governorate_code text default null,
    p_area_code text default null,
    p_product_id bigint default null,
    p_limit integer default 20
  )
  ```
- **Returns**:
  - `product_id` (bigint)
  - `product_name` (text)
  - `category_name` (text)
  - `previous_sales` (numeric)
  - `current_sales` (numeric)
  - `previous_qty` (numeric)
  - `current_qty` (numeric)
  - `sales_change_pct` (numeric) — `NULL` if previous_sales = 0
  - `status` (text) — `STOPPED_BUYING`, `DECLINING`, `GROWING`, `NEW_PRODUCT`, `STABLE`
  - `recovery_value` (numeric) — `GREATEST(previous_sales - current_sales, 0)` for `STOPPED_BUYING` or `DECLINING`
- **Semantics**:
  - Compares period `[p_start_date, p_end_date]` against immediately preceding equivalent period `[p_start_date - period_days, p_start_date - 1]`.

---

### RPC #3: `analytics_customer_favorite_products_v2`
- **Signature**:
  ```sql
  analytics_customer_favorite_products_v2(
    p_customer_id bigint,
    p_start_date date,
    p_end_date date,
    p_company_name text default null,
    p_salesperson text default null,
    p_governorate_code text default null,
    p_area_code text default null,
    p_limit integer default 20
  )
  ```
- **Returns**:
  - `product_id` (bigint)
  - `product_name` (text)
  - `sales_value` (numeric)
  - `orders_count` (bigint)
  - `quantity` (numeric)
  - `sales_share_pct` (numeric) — Share of customer's total product sales in period (`NULL` if total sales = 0)
  - `last_order_date` (date)

---

### RPC #4: `analytics_product_top_customers_v2`
- **Signature**:
  ```sql
  analytics_product_top_customers_v2(
    p_product_id bigint,
    p_start_date date,
    p_end_date date,
    p_company_name text default null,
    p_salesperson text default null,
    p_governorate_code text default null,
    p_area_code text default null,
    p_customer_id bigint default null,
    p_limit integer default 20
  )
  ```
- **Returns**:
  - `customer_id` (bigint)
  - `customer_name` (text)
  - `company_name` (text)
  - `salesperson` (text)
  - `governorate_name` (text)
  - `area_name` (text)
  - `orders_count` (bigint)
  - `sales_value` (numeric) — Product subtotal (not full order value)
  - `quantity` (numeric)
  - `last_order_date` (date)

---

### RPC #5: `analytics_customer_retention_details_v2`
- **Signature**:
  ```sql
  analytics_customer_retention_details_v2(
    p_month date,
    p_company_name text default null,
    p_salesperson text default null,
    p_governorate_code text default null,
    p_area_code text default null,
    p_customer_id bigint default null,
    p_product_id bigint default null,
    p_status text default null,
    p_limit integer default 20,
    p_offset integer default 0
  )
  ```
- **Returns**:
  - `company_name` (text)
  - `customer_id` (bigint)
  - `customer_name` (text)
  - `previous_salesperson` (text)
  - `current_salesperson` (text)
  - `previous_orders` (bigint)
  - `current_orders` (bigint)
  - `previous_sales` (numeric)
  - `current_sales` (numeric)
  - `retention_status` (text) — `RETAINED`, `TRANSFERRED`, `LOST`, `NEW_IN_WINDOW`, `REACTIVATED`
  - `sales_change_pct` (numeric) — `NULL` if previous_sales = 0
  - `previous_last_order_date` (date)
  - `current_last_order_date` (date)

---

### RPC #6: `analytics_customer_action_center_scoped_v2`
- **Signature**:
  ```sql
  analytics_customer_action_center_scoped_v2(
    p_as_of_date date default null,
    p_company_name text default null,
    p_salesperson text default null,
    p_governorate_code text default null,
    p_area_code text default null,
    p_customer_id bigint default null,
    p_product_id bigint default null,
    p_priority text default null,
    p_action_type text default null,
    p_risk text default null,
    p_search text default null,
    p_limit integer default 20,
    p_offset integer default 0
  )
  ```
- **Returns**:
  - `customer_id` (bigint)
  - `customer_name` (text)
  - `company_name` (text)
  - `salesperson` (text)
  - `priority` (text) — `P1_CRITICAL`, `P2_HIGH`, `P3_MEDIUM`, `P4_LOW`
  - `action_type` (text) — `WIN_BACK`, `CROSS_SELL_DEFENSE`, `RELATIONSHIP_CHECK`, `UPSELL`
  - `action_reason` (text)
  - `last_order_date` (date)
  - `days_since_last_order` (integer)
  - `median_buying_interval` (integer)
  - `previous_30d_sales` (numeric)
  - `recent_30d_sales` (numeric)
  - `sales_change_pct` (numeric)
  - `recovery_opportunity` (numeric)
  - `risk` (text) — `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `salesperson_changed` (boolean)

---

## 4. SQL Verification & Reconciliation Scripts

### Retention Reconciliation Check
```sql
-- For Month '2026-08-01' across test scopes (ALL, MAS, Horeca Smart, Cairo, Product 8516, Customer 30709):
WITH summary AS (
  SELECT * FROM public.analytics_customer_retention_summary_v2('2026-08-01'::date, 'MAS', NULL, NULL, NULL, NULL, NULL)
),
details AS (
  SELECT
    COUNT(*) FILTER (WHERE retention_status IN ('RETAINED', 'TRANSFERRED', 'LOST')) AS details_prev_active_count,
    COALESCE(SUM(previous_sales) FILTER (WHERE retention_status = 'LOST'), 0) AS details_lost_sales
  FROM public.analytics_customer_retention_details_v2('2026-08-01'::date, 'MAS', NULL, NULL, NULL, NULL, NULL, NULL, 10000, 0)
)
SELECT
  s.previous_active_customers,
  d.details_prev_active_count,
  (s.previous_active_customers - d.details_prev_active_count) AS customer_count_diff, -- EXPECTED: 0
  s.lost_previous_sales,
  d.details_lost_sales,
  (s.lost_previous_sales - d.details_lost_sales) AS sales_diff -- EXPECTED: 0.00
FROM summary s, details d;
```

### Action Center Equivalence Check
```sql
-- When governorate, area, customer, product are NULL:
WITH v2 AS (
  SELECT customer_id, priority, action_type, risk, recent_30d_sales, previous_30d_sales, recovery_opportunity
  FROM public.analytics_customer_action_center_v2('2026-08-16'::date, 'MAS', NULL, NULL, NULL, NULL, 100, 0, NULL)
),
scoped AS (
  SELECT customer_id, priority, action_type, risk, recent_30d_sales, previous_30d_sales, recovery_opportunity
  FROM public.analytics_customer_action_center_scoped_v2('2026-08-16'::date, 'MAS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 100, 0)
)
SELECT
  COUNT(*) AS mismatched_rows
FROM v2
FULL OUTER JOIN scoped ON v2.customer_id = scoped.customer_id
WHERE v2.priority IS DISTINCT FROM scoped.priority
   OR v2.action_type IS DISTINCT FROM scoped.action_type
   OR v2.risk IS DISTINCT FROM scoped.risk
   OR v2.recent_30d_sales IS DISTINCT FROM scoped.recent_30d_sales
   OR v2.previous_30d_sales IS DISTINCT FROM scoped.previous_30d_sales
   OR v2.recovery_opportunity IS DISTINCT FROM scoped.recovery_opportunity; -- EXPECTED: 0
```
