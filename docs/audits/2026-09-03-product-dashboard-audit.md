# Product Dashboard & Product 360 Audit

Date: 2026-09-03
Branch: p1/access-control-design-2026-09-03
Status: Audit only. No production changes applied.

## P-001 — PASS: product sales reconciliation is financially closed

Audited 2026-09-01..03:
- Canonical order sales: EGP 5,219,315.79
- Product summary sales sum: EGP 5,219,315.79
- Product reconciliation RPC: 100%
- Difference: EGP 0.00

Product-line revenue can therefore be used for product sales analytics under the canonical commercial-order universe.

## P-002 — Critical: Product Dashboard total order KPI double-counts orders

The UI currently calculates:
`totalOrders = SUM(product.ordersCount)`

An order containing several products is counted once for every product in that order.

Audited 2026-09-01..03:
- Sum of per-product order counts: 714
- Canonical distinct orders: 129

Therefore this value must not be labeled `Total Orders`.

Options:
1. Preferred executive KPI: fetch distinct canonical orders separately = 129
2. If kept as product-grain metric, rename to `Product-Order Occurrences` / `SKU Order Incidences`

## P-003 — Critical: Product Dashboard total customer KPI double-counts customers

The UI currently calculates:
`totalCustomers = SUM(product.uniqueCustomers)`

A customer buying multiple SKUs is counted for every SKU.

Audited 2026-09-01..03:
- Sum of per-product customer counts: 697
- Canonical distinct buying customers: 114

Do not label 697 as Total Customers.

Preferred executive KPI:
Distinct customers in canonical selected scope.

If the summed metric is useful, label it `Product-Customer Relationships` / `SKU Buyer Incidences`.

## P-004 — PASS: total product sales and total quantity are additive product-grain metrics

Safe additive metrics:
- SUM(product sales)
- SUM(quantity sold)

Non-additive metrics:
- distinct orders per product
- distinct customers per product
- active salespeople per product
- companies count per product

Never sum non-additive distinct counts across SKUs and present as enterprise distinct counts.

## P-005 — Medium: Average Sales per Product is mathematically valid but requires interpretation

Current:
`total product sales / products returned`

This is average revenue per active/returned SKU in the selected filter scope.

Recommended label:
`Average Sales per Active SKU`

Do not interpret as average product price or average order value.

## P-006 — Medium: Product 360 selected-period vs historical trend semantics must stay separate

Product 360 selected-period functions use the filtered date window for:
- period sales
- period quantity
- daily trend
- company split
- top customers
- top salespeople

`analytics_product_trend` is historical monthly trend and does not consume the selected date range.

This is acceptable if UI labels it clearly as historical/monthly trend rather than selected-period trend.

## P-007 — High: Product Customer Retention is immediate equal-length-period behavior, not monthly retention

`analytics_product_customer_retention` calculates:
- current = selected start..end
- previous = immediately preceding equal-length period

Example for 2026-09-01..03:
Previous comparison = 2026-08-29..31, not 2026-08-01..03 and not August full month.

Statuses:
- NEW_TO_PRODUCT
- STOPPED_BUYING
- DECLINING
- RETAINED

These are useful product recovery / repeat-purchase signals for adjacent periods.

They must not be presented as finalized monthly Product Retention unless a separate calendar-month comparison is implemented.

Recommended naming for current implementation:
`Product Repeat / Recovery Analysis — Previous Equal-Length Period`

## P-008 — High: partial-period STOPPED_BUYING must not imply churn

For Current MTD or short custom ranges, a customer with zero current purchases of a product can be classified STOPPED_BUYING versus the immediately previous short period.

This is not proof the customer has churned from the SKU.

Recommended distinction:
- Short-term Product Drop-off Signal
- Monthly Product Retention
- Long-term Product Churn / Dormancy

## P-009 — Medium: Product 360 service uses dateRange instead of explicit effective fields

Most Product 360 service calls read `filters.dateRange.startDate/endDate`.

Current AppContext generally synchronizes dateRange to the effective data window, so this is not currently proven to create a runtime future-date bug.

Still recommended:
Use explicit `effectiveStartDate/effectiveEndDate` for selected-period commercial metrics to keep the contract unambiguous.

## P-010 — PASS: Product 360 quantity field compatibility fix remains correct

The SDK supports production RPC names `period_qty` / `lifetime_qty` as aliases for period/lifetime quantity.

This preserves the P0 Product 360 production contract fix.

## Product Dashboard recommended KPI row

Selected-period additive / enterprise-safe KPIs:
1. Active SKUs
2. Product Sales
3. Quantity Sold
4. Distinct Orders — from canonical order scope
5. Distinct Buying Customers — from canonical order scope
6. Average Sales per Active SKU

Do not derive 4 or 5 by summing per-product distinct counts.

## Product 360 recommended structure

### Selected Period Performance
- Sales
- Quantity
- Orders for SKU
- Customers for SKU
- Salespeople for SKU
- Average Unit Value
- Daily trend
- Company split

### Historical Product Profile
- lifetime sales/qty/orders/customers under available history
- first/last sale
- active months

### Customer Behavior
Separate:
- adjacent-period drop-off / recovery
- completed-month product retention
- long-term product dormancy when enough history exists

### Commercial Distribution
- Top customers
- Top order-level salespeople
- Company split

## Release findings summary

PASS:
- financial reconciliation
- product sales aggregation
- quantity aggregation
- Product 360 quantity aliases

FIX / RELABEL REQUIRED:
- total orders double count
- total customers double count
- average sales per product label
- product retention time semantics
- STOPPED_BUYING churn wording
- explicit effective-date contract
