# Executive Dashboard KPI & Filter Audit

Date: 2026-09-03
Branch reviewed: p1/access-control-design-2026-09-03
Status: Review in progress — no production migration or KPI correction applied yet.

## Audit standard

Every KPI is checked across:
1. Raw/authoritative Supabase source
2. Analytics RPC result
3. SDK/service mapping
4. Dashboard presentation
5. Filter semantics

## Default period rule (approved direction)

For `current_month`, the effective window must be Month-to-Date (MTD):

- start = first day of current Cairo calendar month
- end = min(current Cairo date, latest available sales data date)

On 2026-09-03, expected default period is `2026-09-01` through `2026-09-03`.

### Finding D-001 — Critical

`packages/core/src/filters/dateFilters.ts` currently defaults `getCurrentMonthRange()` and `getPreviousMonthRange()` to the literal date `2026-08-10` when no reference date is supplied. `AppContext` calls these helpers without a date, so the default month can remain August 2026 even when the application is opened in September.

Required correction: remove hard-coded runtime date and resolve current date in Africa/Cairo deterministically.

## Executive KPI validation — 2026-09-01 to 2026-09-03

### Revenue
- Raw sales_orders_odoo18: EGP 5,219,315.79
- analytics_sales_executive_kpis_v2: EGP 5,219,315.79
- Status: PASS

### Confirmed Orders
- Raw: 129
- RPC: 129
- Status: PASS

### Active / Unique Customers
- Raw distinct customer_id: 114
- RPC: 114
- Status: PASS

### Average Order Value
- Raw: EGP 40,459.81
- RPC: EGP 40,459.81
- Status: PASS

### Finding K-001 — Critical: Revenue growth comparison semantics

For current period `2026-09-01..2026-09-03`, `analytics_sales_executive_kpis_v2` reports previous sales EGP 4,664,362.27 and growth +11.90%.

The RPC calculates the immediately preceding equal-length period (`2026-08-29..2026-08-31`), not the same days of the previous month.

Raw sales for `2026-08-01..2026-08-03` are EGP 15,338,366.85.

Required reporting distinction:
- Primary monthly KPI: MTD vs same elapsed days of previous month
- Optional secondary trend: selected range vs immediately preceding equal-length range

Do not label the latter as monthly MTD growth.

## Retention / churn

### Finding K-002 — Critical: Partial-month false loss

The Executive service derives retention month from the selected start month. With September MTD selected, it queries September retention while September is incomplete.

Current September result on 2026-09-03:
- Previous active: 523
- Retained same rep: 94
- Transferred: 3
- True lost: 426
- New: 8
- Company retention: 18.55%
- Same-rep retention: 17.97%
- Lost previous sales: EGP 29,279,500.87

These values must not be presented as finalized churn/loss during the first three days of the month.

Latest completed month (August 2026) currently returns:
- Previous active: 507
- Retained same rep: 298
- Transferred: 61
- True lost: 148
- New: 125
- Company retention: 70.81%
- Same-rep retention: 58.78%
- Lost previous sales: EGP 10,857,673.31

Required rule:
- When dashboard period is current MTD, finalized retention/lost KPIs use latest completed month.
- If current-month retention progress is ever shown, label it clearly as provisional/in-progress and never as finalized lost customers.

## Sales representative attribution

### Finding K-003 — High: Order sales vs portfolio ownership mixed

Raw order-level MTD sales are grouped by `sales_orders_odoo18.salesperson`.

`analytics_sales_rep_summary_v2` uses `sales_rep_monthly_performance_odoo18`, whose sales block is built from `customer_monthly_activity_odoo18.primary_salesperson`.

Example difference for 2026-09-01..03:
- Lames Magdy raw order sales: 25 orders / EGP 254,640.83
- monthly performance view: 26 orders / EGP 258,160.18
- Naden Amgad raw order sales: 11 orders / EGP 116,594.18
- monthly performance view: 10 orders / EGP 113,074.83

Required separation:
- Sales performance / ranking = salesperson recorded on the order
- Portfolio ownership / retention / transfer = primary/current/previous salesperson relationship

Filter-list RPC `analytics_filter_salespeople` reconciles to order-level salesperson numbers for the tested MTD scope, so it is a better attribution reference for sales performance than the current monthly portfolio performance view.

## Daily sales trend

Raw vs `analytics_sales_daily_summary_v2` reconciles exactly for the audited MTD window:
- 2026-09-01: EGP 1,478,392.78 / 57 orders
- 2026-09-02: EGP 3,632,701.89 / 65 orders
- 2026-09-03: EGP 108,221.12 / 7 orders

Status: PASS for total daily sales and order counts.

## Company split

Raw 2026-09-01..03:
- MAS: 36 orders, 27 customers, EGP 3,722,693.78
- Horeca Smart: 93 orders, 87 customers, EGP 1,496,622.01
- Total: EGP 5,219,315.79

### Finding K-004 — Critical: company revenue fields missing from daily RPC mapping

`analytics_sales_daily_summary_v2` currently returns `sales_date`, `total_sales`, `confirmed_orders`, `active_customers`, and `average_order_value`. It does not return `horeca_sales` or `mas_sales`.

The SDK mapper reads `row.horeca_sales ?? 0` and `row.mas_sales ?? 0`. `executiveService.ts` then sums those mapped fields to construct the company donut, causing company revenues to resolve to zero even though the total daily trend is correct.

Required correction: source company split from a dedicated company aggregation RPC or extend the daily RPC contract to return explicit company totals. Do not infer company share from missing fields.

### Finding K-005 — Medium

`executiveService.ts` constructs company breakdown `ordersCount` as hard-coded `0` for both companies. Revenue share is useful only after K-004 is fixed, and company order counts must come from live aggregation rather than zero placeholders.

## Top customers

Top-customer RPC for 2026-09-01..03 reconciles with direct order aggregation for the sampled top 10 customers. Status: PASS for revenue/order/AOV ranking sample.

## Product filter

A sample audit using product `8551` initially showed product-line revenue above the Executive result. Drill-down confirmed the difference came from product lines whose orders are not part of the canonical `sales_orders_odoo18` commercial universe, including a large Horeca Smart -> MAS transaction.

When product lines are restricted to orders present in the canonical commercial sales universe, the Executive RPC reconciles:
- EGP 537,631.22
- 6 orders

Status: PASS for the tested product filter under canonical commercial-order semantics.

## Tested base filters

For `2026-09-01..03`, Executive KPI RPC reconciled exactly to raw sales for:
- Company = MAS: EGP 3,722,693.78 / 36 orders / 27 customers
- Salesperson = Haddil Haron: EGP 2,815,944.30 / 32 orders / 24 customers
- Customer = 30543: EGP 433,815.78 / 3 orders / 1 customer

Status: PASS for Company, Salesperson, and Customer base KPI filtering in the tested cases.

## Current Executive KPI cards

Current KPI cards are:
- Total Sales Revenue
- Confirmed Orders
- Unique Customers
- AOV
- Retention Rate (when available)

Orders, customers and AOV currently carry `previousValue = 0` and `growthPercent = 0`; these should not visually imply a measured 0% change. Prefer null/unavailable until valid comparison values are calculated.

## Next audit steps

1. Current/previous/custom date period behavior
2. Company filter option list and cascading validation
3. Salesperson filter cascading behavior
4. Customer filter search/list consistency
5. Governorate/area filters and geography quality
6. Product filter across company/salesperson scopes
7. Executive top reps correction to order attribution
8. Retention latest-completed-month rule
9. Define final Executive KPI dictionary and comparison rules
10. Implement fixes only after audit findings are accepted
