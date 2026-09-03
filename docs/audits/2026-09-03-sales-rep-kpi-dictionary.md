# Sales Rep 360 KPI Dictionary

Date: 2026-09-03
Status: Proposed canonical definitions from live audit. No production change applied.

## Core principle

Sales Rep 360 must separate:
1. Selected-period order sales performance
2. Completed-month customer portfolio retention
3. Current portfolio actions / recovery work

A metric must never silently cross these time/ownership models.

---

# A. Selected Period Sales Performance

## A1. Sales Revenue
Definition: sum of canonical confirmed commercial order value where the order salesperson equals the rep within the effective selected scope.
Formula: `SUM(order_value)`.
Date scope: full effective selected range.
Filters: Company, authorized salesperson scope, Governorate, Area, Customer, Product where applicable.
Comparison for Current MTD: same elapsed days previous calendar month.

## A2. Confirmed Orders
Definition: distinct canonical confirmed commercial orders recorded under the rep.
Formula: `COUNT(DISTINCT order_id)`.
Date scope: full effective selected range.

## A3. Active Customers in Period
Definition: distinct customers with at least one canonical order recorded under the rep during the selected period.
Formula: `COUNT(DISTINCT customer_id)`.
Do not confuse this with current owned portfolio size.

## A4. AOV
Definition: selected-period rep sales / rep confirmed orders.
If orders = 0, return null/unavailable.

## A5. Revenue Growth
For Current MTD: compare to same elapsed days of previous month.
For completed full month: compare to previous full month.
For arbitrary custom range: label comparison method explicitly; preferred default is same-length prior period only when calendar-month comparison is not meaningful.

## A6. Orders Growth
Same comparison basis as A5.

## A7. Active Customer Growth
Same comparison basis as A5.

## A8. Product / Category Mix
Source: product lines restricted to canonical commercial orders attributed to the rep on the order.
Must close financially to rep selected-period sales.

---

# B. Latest Completed Month Portfolio Health

## B1. Previous Active Portfolio
Definition: customers in the rep's previous-month active portfolio.
Period: finalized completed month only.

## B2. Retained Same Rep
Definition: previous active customers remaining active with the same rep.

## B3. Same-Rep Retention Rate
Formula: `Retained Same Rep / Previous Active Portfolio * 100`.
This is a portfolio KPI, not a sales attribution KPI.

## B4. Transferred Out
Definition: previous active customers who remained company-active but moved from this rep to another rep.

## B5. Transferred In
Definition: active customers received by this rep from another rep.

## B6. Lost Customers
Definition: previous active customers finalized as lost after complete monthly comparison, excluding transfers.
Never finalized from incomplete Current MTD.

## B7. New Customers
Definition: first-time buyers assigned/currently attributed according to governed lifecycle logic during the completed month.
If current-MTD acquisition is shown elsewhere, label it separately as MTD New Customers.

## B8. Reactivated Customers
Definition: customers returning after qualifying inactivity according to the governed retention model.

## B9. Lost Previous Revenue
Definition: previous-month revenue attached to customers finalized as lost from this rep's previous portfolio.
Period: completed month only.

---

# C. Portfolio / Customer Table Semantics

The UI must explicitly identify which customer set is shown.

Allowed table modes:
1. `Selected Period Buying Customers`
2. `Current Owned Portfolio`
3. `Completed Month Retention Cohort`

The existing month-based `analytics_sales_rep_customers` table corresponds to a monthly portfolio/activity view and must not be labeled as an arbitrary selected date-range table.

Recommended default for Sales Rep 360:
- Main customer table: Selected Period Buying Customers
- Secondary tab: Portfolio Health / Retention Cohort

---

# D. Trend

Recommended canonical rule:
`Last 6 completed months + current MTD sales point`, using order-level salesperson for Sales/Orders/Active Customers.

Retention trend should be a separate series based on completed months only.

Do not mix a partial current-month retention value into a finalized retention trend.

---

# E. Daily Actions / Recovery

Daily Action Center uses current authorized portfolio and an explicit `as_of_date`.

Metrics may include:
- At-risk customers
- overdue reorder opportunities
- recovery opportunity value
- priority actions
- recent vs previous 30-day sales

These are operational portfolio metrics and should not inherit an arbitrary historical sales date filter unless that behavior is explicitly intended.

---

# F. Multi-company behavior

Stable identity must include a governed salesperson ID and explicit company scope.

For Manager/Admin:
- User may select one company or Combined Companies.
- Combined sales metrics aggregate order-level sales correctly.
- Portfolio metrics aggregate company-specific cohorts without double counting.

For Supervisor:
- one company + one team only.

For Sales Rep:
- own authorized company/team/person scope only.

No rep should be identified solely by display name for authorization or aggregation.

---

# G. UI top-row recommendation

Selected-period cards:
1. Sales Revenue
2. Orders
3. Active Customers in Period
4. AOV
5. Revenue Growth
6. Orders Growth
7. Customer Growth

Completed-month portfolio block:
1. Previous Active Portfolio
2. Same-Rep Retention Rate
3. Retained Same Rep
4. Lost Customers
5. Transferred Out
6. Transferred In
7. New Customers
8. Reactivated Customers
9. Lost Previous Revenue

---

# H. Null / comparison policy

Unavailable is not zero.

Rules:
- No comparable period -> growth = null
- No orders -> AOV = null
- Incomplete month -> finalized lost/retention unavailable for that month; use latest completed month instead
- No portfolio row -> do not fabricate 0% retention

Applies to UI, exports, AI context, drill-downs, rankings, and scorecards.

---

# I. Audit examples

Mona Mohamed, 2026-09-01..02 order-level truth:
- EGP 304,205.80
- 17 orders
- 15 customers

Current month-based summary returned 2026-09-01..03 values:
- EGP 374,780.40
- 18 orders
- 16 customers

This demonstrates why selected-period sales and monthly portfolio summary must be separate.

Mona Mohamed, August 2026:
Order-level sales truth:
- 242 orders
- 86 customers
- EGP 5,930,833.13

Portfolio-based monthly summary:
- 239 orders
- 83 customers
- EGP 5,943,125.81

Use the first set for sales-performance ranking, the portfolio model for retention/ownership metrics.
