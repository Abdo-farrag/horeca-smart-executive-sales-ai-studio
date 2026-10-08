# OTC geography — staging acceptance gate

**Status:** Draft PR only. Do not run on production. The CI validates TypeScript parsing/contracts, not live Odoo behavior, SQL DDL, or financial reconciliation.

## 1. Migration / security validation (staging)

Apply migrations in filename order, from 20261007070000 through 20261007077000, to a disposable **staging** Supabase database. Validate no errors, rollback on failure, and check RPC privileges, RLS, and SECURITY DEFINER. Never put a service-role key in a frontend client.

Read-only SQL after staging migrations:

```sql
select count(*) as customer_geo_rows,
       count(distinct (customer_id,company_id)) as unique_keys
from public.customer_geography_dimension;

select company_id,coverage_status,orders_count
from public.otc_order_shipping_coverage_v1
order by company_id,coverage_status;

select geography_resolution_source,count(*) as events
from public.otc_delivery_geography_v1
group by 1 order by 1;

select geography_resolution_source,count(*) as events
from public.otc_return_geography_v1
group by 1 order by 1;

select count(*) as missing_commercial_customer
from public.otc_delivery_lines
where customer_id is null;

select count(*) as return_with_original_address,
       count(*) filter (where return_partner_id is not null) as return_with_pickup_partner
from public.otc_return_lines
where delivery_partner_id is not null;
```

## 2. Functional sample scenarios

1. One commercial customer, **two distinct shipping partners** in different areas. Confirm order geography follows `sale.order.partner_shipping_id`, delivery geography follows outbound `stock.picking.partner_id`, and neither creates duplicate sales lines.
2. Return from an original outbound delivery older than sync cutoff: `otc_return_lines.delivery_partner_id` must be original outbound address; `return_partner_id` is return pickup partner. Unknown original address must remain null and be labeled fallback/unmapped.
3. Shared `res.partner` shipping address across multiple commercial customers: dimension `customer_id` stays null; order/customer attribution remains on order lines.
4. Two companies: same partner ID may occur in both companies, but each row must be scoped to `company_id`; no cross-company visibility or KPI leakage.
5. Unmapped address and state-only classification: no false area claim; manual review flags stay visible.
6. Shipping coverage must explicitly show `shipping_not_synced` vs `shipping_partner_missing`. Sync currently covers linked orders only; do **not** present full order geography as verified until a separate complete backfill is approved.

## 3. Performance comparison

Compare old production EXPLAIN **without ANALYZE** and staging EXPLAIN (ANALYZE, BUFFERS) on identical scoped date/company filters. In staging, use representative synthetic/anonymized rows; fresh staging branches do not contain production data.

Record planning/execution time, buffer hits/reads, row count, and whether `idx_psfj_order_date_raw` is used. KPI and Trend RPCs must complete within the configured request timeout; do not assert performance improvement based on cost estimates alone.

## 4. Odoo Dry Run and Finance sign-off

Use authenticated admin/manager Dry Run with company IDs 1,2 and a narrow date range. Verify `sync_logs`, missing Odoo fields, shipping address resolution rate, sale line linking, and invoice multi-link allocation. Then compare warehouse deliveries, returns, invoices, credit notes, and net realized sales for a signed-off sample. Do **not** run Sync Now before reconciliation approval.

**Deployment sequence:** SQL migrations → Edge Function deployment → authorized Dry Run → small bounded Sync → reconciliation → widen scope. Any failed gate keeps PR in Draft.
