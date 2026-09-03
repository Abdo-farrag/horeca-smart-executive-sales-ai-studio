# Executive Dashboard KPI Dictionary

Date: 2026-09-03
Status: Proposed canonical business definitions from live audit. No production change applied.

## Period semantics

### Default period
`Current Month MTD`
- Start: first day of current Africa/Cairo calendar month
- End: min(current Cairo date, latest available sales data date)

Example on 2026-09-03: `2026-09-01..2026-09-03`.

### Primary comparison for MTD
`Same elapsed days of previous calendar month`.

Example:
- Current: `2026-09-01..2026-09-03`
- Previous comparable: `2026-08-01..2026-08-03`

Do not use the immediately preceding equal-length period as the primary Monthly MTD comparison.

### Latest completed month rule
Monthly retention, finalized lost customers, transfer rate, and lost-customer revenue must use the latest completed calendar month when the selected period is Current MTD.

---

## KPI 1 — Total Sales Revenue

Arabic label: `إجمالي المبيعات`

Definition:
Sum of canonical confirmed commercial order value within the effective filter scope.

Canonical source:
`sales_orders_odoo18.order_value` / equivalent governed analytics layer.

Formula:
`SUM(order_value)`

Filters:
Date, Company, Salesperson, Governorate, Area, Customer, Product where supported by canonical commercial-order semantics.

Comparison:
For Current MTD, compare against same elapsed days of previous calendar month.

Audited current example:
- 2026-09-01..03: EGP 5,219,315.79
- 2026-08-01..03: EGP 15,338,366.85
- Growth: -65.97%

Status: Core value PASS. Comparison logic requires correction.

---

## KPI 2 — Confirmed Orders

Arabic label: `عدد الطلبات المؤكدة`

Definition:
Distinct canonical confirmed commercial sales orders inside the effective scope.

Formula:
`COUNT(DISTINCT order_id)`

Comparison:
Same elapsed days of previous month for Current MTD.

Audited example:
- Current: 129
- Previous comparable: 219
- Growth: -41.10%

Status: Core value PASS. Comparison value currently absent in UI and must not display fake 0%.

---

## KPI 3 — Active Customers

Preferred Arabic label: `العملاء النشطون خلال الفترة`
Preferred English label: `Active Customers in Period`

Avoid generic `Unique Customers` on executive management cards because the business interpretation is active purchasing customers in the selected period.

Definition:
Distinct customers with at least one canonical confirmed commercial order in the effective scope.

Formula:
`COUNT(DISTINCT customer_id)`

Comparison:
Same elapsed days of previous month for Current MTD.

Audited example:
- Current: 114
- Previous comparable: 168
- Growth: -32.14%

Status: Core value PASS. Comparison currently absent in UI.

---

## KPI 4 — Average Order Value (AOV)

Arabic label: `متوسط قيمة الطلب`

Definition:
Canonical sales revenue divided by confirmed orders in the same scope.

Formula:
`Revenue / Confirmed Orders`

Null rule:
If confirmed orders = 0, return null/unavailable, not zero.

Comparison:
Same elapsed days of previous month for Current MTD.

Audited example:
- Current: EGP 40,459.81
- Previous comparable: EGP 70,038.20
- Growth: -42.23%

Status: Core value PASS. Comparison currently absent in UI.

---

## KPI 5 — Company Retention Rate

Arabic label: `معدل الاحتفاظ بالعملاء`

Definition:
Retention of the previous active customer base at company portfolio level, including customers retained under the same rep or transferred internally.

Formula:
`(Retained Same Rep + Transferred) / Previous Active Customers * 100`

Period rule:
Finalized monthly KPI only.
When Current MTD is selected, show latest completed month and label its month explicitly.

Audited latest completed month — August 2026:
- Previous active: 507
- Retained same rep: 298
- Transferred: 61
- Company retention: 70.81%

Do not use September partial-month result as finalized retention on 2026-09-03.

Status: Formula/source usable; period-selection logic requires correction.

---

## KPI 6 — Same-Rep Retention Rate

Arabic label: `معدل احتفاظ المندوب بمحفظته`

Definition:
Share of previous active customers who remained active with the same salesperson.

Formula:
`Retained Same Rep / Previous Active Customers * 100`

Period rule:
Latest completed month for finalized reporting.

August 2026 audited value: 58.78%.

Important attribution rule:
This is a portfolio ownership KPI and must not be confused with order-level sales attribution.

---

## KPI 7 — True Lost Customers

Arabic label: `العملاء المفقودون فعليًا`

Definition:
Previous active customers classified as lost after the complete monthly comparison window, excluding internal transfers.

Period rule:
Finalized completed month only.

August 2026 audited value: 148.

Do not label customers who have simply not ordered yet during an incomplete Current MTD window as finalized lost.

---

## KPI 8 — New Customers

Arabic label: `العملاء الجدد`

Definition:
Customers classified as first-time buyers according to the governed retention/customer lifecycle logic.

Reporting rule:
- Current MTD new-customer progress may be shown as MTD acquisition.
- Monthly finalized retention panel should show the completed-month value when the panel itself is a completed-month retention report.

August 2026 completed-month audited value: 125.

The UI must distinguish MTD acquisition from completed-month retention statistics rather than mixing the periods silently.

---

## KPI 9 — Transferred Customers

Arabic label: `العملاء المحولون بين المناديب`

Definition:
Previous active customers who remained active at company level but changed salesperson ownership.

Formula is classification-based from customer retention/portfolio ownership logic.

Period rule:
Completed month for finalized management reporting.

August 2026 audited value: 61.

Transfers count as company-retained but not same-rep-retained.

---

## KPI 10 — Lost Customer Previous Revenue

Arabic label: `إيرادات العملاء المفقودين`

Definition:
Previous-period revenue associated with customers finalized as lost in the completed-month retention classification.

August 2026 audited value: EGP 10,857,673.31.

Period rule:
Completed month only for finalized loss reporting.

Do not use partial Current MTD lost classification to generate revenue-at-loss figures.

---

## Sales Rep ranking rule

Sales ranking must use the salesperson recorded on each sales order.

Correct business question:
`Who generated/booked the sale on the order?`

Portfolio/retention ownership must use current/previous/primary salesperson relationship.

Correct business question:
`Who owns or retained the customer portfolio?`

These two concepts must remain separate throughout Executive, Sales Rep 360, filters, rankings, and AI explanations.

---

## Company split rule

Required metrics by operating company:
- Revenue
- Orders
- Active customers
- Revenue share %
- AOV (optional secondary)

Current audited MTD example:
- MAS: EGP 3,722,693.78 / 36 orders / 27 customers
- Horeca Smart: EGP 1,496,622.01 / 93 orders / 87 customers

The current Executive implementation cannot use missing `horeca_sales` / `mas_sales` fields from the daily RPC and must use a governed company aggregation source.

---

## Null / unavailable policy

Never convert an unavailable comparison into a business zero.

Examples:
- Missing previous period -> `null / unavailable`, not `0% growth`
- No orders -> AOV null, not forced zero unless the UI explicitly labels no activity
- Unavailable retention -> hide/mark unavailable, never fabricate zero retention

This rule applies to KPI cards, tables, charts, exports, drill-downs, and AI context.

---

## Geography rule

Governorate and Area KPIs require visible coverage/quality context.

Audited 2026-09-01..03:
- Governorate coverage: 81.58%
- Area coverage: 59.65%
- High-confidence area: 50.88%
- Needs review: 51 customers

Area reporting must default to high-confidence mappings and remain marked as provisional until coverage improves.

---

## Executive top-row recommendation

Primary live MTD cards:
1. Total Sales Revenue
2. Confirmed Orders
3. Active Customers in Period
4. AOV
5. MTD Revenue Growth vs Same Days Previous Month

Completed-month customer-health block:
1. Company Retention Rate
2. Same-Rep Retention Rate
3. True Lost Customers
4. New Customers
5. Transferred Customers
6. Lost Customer Previous Revenue

Keeping these two time semantics visually separate prevents partial-month sales progress from being mixed with finalized monthly churn.