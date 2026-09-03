# Sales Rep 360 KPI & Filter Audit

Date: 2026-09-03
Branch: `p1/access-control-design-2026-09-03`
Status: Audit in progress. No production migration or KPI correction applied.

## Audit objective

Validate Sales Rep 360 across:
1. Order-level sales attribution
2. Portfolio ownership / retention attribution
3. Date range semantics
4. Global filter propagation
5. RPC -> SDK -> service -> UI mapping
6. Multi-company behavior

## Canonical attribution rule

Sales performance must answer:
`Who is the salesperson recorded on the order?`

Portfolio / retention must answer:
`Who owned the customer before/currently?`

These must remain separate.

---

## Finding SR-001 — Critical: Sales Rep Summary ignores selected end date

`fetchSalesRepSummaryList()` derives only a month from `effectiveStartDate` and calls a month-based summary RPC. It does not pass an effective end date.

Audit example — Mona Mohamed:

Selected custom period intended: `2026-09-01..2026-09-02`
- Correct order-level sales: EGP 304,205.80
- Correct orders: 17
- Correct customers: 15

Month summary returned:
- EGP 374,780.40
- 18 orders
- 16 customers

Those values include 2026-09-03.

Conclusion:
Sales Rep Summary does not currently honor arbitrary selected-period end dates. Labels such as `Selected period total` are therefore misleading.

Required architecture:
- Selected-period Sales Performance: date-range RPC based on order-level salesperson
- Monthly Portfolio/Retention: month-based RPC

---

## Finding SR-002 — Critical: Governorate / Area / Customer / Product filters are not forwarded by the service

The SDK `analytics.salesReps.summary()` supports:
- governorateCode
- areaCode
- customerId
- productId

But `fetchSalesRepSummaryList()` currently forwards only:
- month
- companyName
- salesperson

The hook includes geography/customer/product in its `filterKey`, so the UI reloads when these filters change, but the service requests the same unfiltered summary.

Proof sample — Mona Mohamed + product 8516:

Correct `analytics_sales_rep_summary_v2` with product filter:
- Sales: EGP 2,550
- Orders: 1
- Customers: 1

Unfiltered monthly summary used by current service:
- Sales: EGP 374,780.40
- Orders: 18
- Customers: 16

Status: FAIL.

---

## Finding SR-003 — High: Sales and portfolio ownership are mixed in one row

For September 1–3, some reps happen to reconcile because the current month is only three days old. For a completed month the difference is visible.

Mona Mohamed — August 2026:

Order-level salesperson truth:
- 242 orders
- 86 customers
- EGP 5,930,833.13

Monthly portfolio summary:
- 239 orders
- 83 customers
- EGP 5,943,125.81

The monthly summary is built from customer portfolio ownership, not pure order salesperson attribution.

Implication:
Using this summary for sales ranking can reassign sales when customer ownership changes.

Required separation:
- Sales / Orders / AOV / sales ranking = order-level salesperson
- Previous / retained / lost / transfers / portfolio retention = customer ownership model

---

## Finding SR-004 — Critical: Partial-month lost/retention is presented as if finalized

For current September month on 2026-09-03:

Mona Mohamed:
- Previous customers: 83
- Retained: 15
- Lost: 68
- Retention rate: 18.07%

Haddil Haron (MAS row):
- Previous customers: 78
- Retained: 22
- Lost: 56
- Retention rate: 28.21%

These are not finalized churn values. They mostly reflect customers who simply have not ordered yet by day 3.

Required rule:
- Current MTD sales activity may be live
- Finalized rep retention/lost must use latest completed month
- Optional current-month retention progress must be explicitly labeled provisional

---

## Finding SR-005 — High: Rep 360 customers and retention details are month-based, not selected-range based

`fetchSalesRep360All()` derives:
`month = filters.dateRange.startDate`

It then calls:
- monthly customers RPC
- monthly retention details RPC

For Mona in September these return:
- Customer portfolio: 16 customers / 18 orders / EGP 374,780.40
- Retention details current activity: 18 orders / EGP 374,780.40

Therefore a user selecting `2026-09-01..2026-09-02` still receives month-to-latest-data values including September 3.

Required UI distinction:
- `Selected Period Customers` from date-range order data
- `Monthly Portfolio / Retention Customers` from monthly lifecycle data

Do not call both simply `selected period`.

---

## Finding SR-006 — Medium: Trend range is hard-coded to calendar 2026

`fetchSalesRepTrend()` defaults to:
- startMonth = `2026-01-01`
- endMonth = `2026-12-31`

`fetchSalesRep360All()` calls it without passing the user's selected range.

Current Mona trend audit returned 6 available months totaling:
- EGP 14,233,375.03
- 695 orders

The trend may be useful as a rolling/history panel, but it is not controlled by the global date range as the surrounding UI implies.

Required decision:
- either label it fixed/rolling history explicitly
- or derive trend start/end from a documented range rule

---

## Finding SR-007 — Medium: Same salesperson can produce multiple company rows

The summary is company-scoped and a salesperson can appear in multiple company rows, including rows with zero current sales but portfolio/retention history.

Haddil Haron September example includes:
- MAS current-sales row: 32 orders / 24 customers / EGP 2,815,944.30
- another company portfolio row with 0 current sales but previous/lost customers

The UI combines rows by salesperson name when selecting a rep. This can mix companies and portfolio statistics silently.

Required rule:
Use stable salesperson identity + explicit company scope. If multi-company aggregation is allowed for Manager/Admin, label it `Combined companies` and aggregate each metric with correct semantics.

---

## Finding SR-008 — Medium: Default selected rep is hard-coded to Mona Mohamed

`SalesRepDashboard.tsx` initializes:
`selectedRepName = 'Mona Mohamed'`

This is not role-safe and is not scope-safe for a Sales Rep or Supervisor user.

Required behavior:
- Sales Rep role: self automatically
- Supervisor: first/selected rep within authorized team only
- Manager/Admin: no hard-coded person; select first authorized/result row or explicit all-reps state

---

## Finding SR-009 — Medium: UI labels overstate period correctness

Examples in Sales Rep 360 include:
- `Current Sales` + `Selected period total`
- `Active Customers` + `Ordered in period`
- header displays selected date-range start as `Month`

But the underlying summary is month-based.

Required correction:
After architecture separation, every panel must display its true time basis:
- `MTD / Selected Range`
- `Latest Completed Month`
- `Monthly History`

---

## Retention detail semantics — PASS with labeling correction

For Mona, August 2026 retention details:
- RETAINED: 63 customers
- LOST: 18
- NEW_IN_WINDOW: 10
- REACTIVATED: 9
- TRANSFERRED: 3 total rows touching Mona

Summary correctly distinguishes direction:
- transferred out: 2
- transferred in: 1

The retention-details RPC intentionally includes a customer when Mona is either previous or current salesperson. Therefore a single `Transferred` tab must show direction per row or split into `Transferred Out` and `Transferred In`.

Portfolio retention logic is useful and should be preserved, but not blended with selected-period order sales.

---

## Recommended Sales Rep 360 structure

### Block A — Selected Period Sales Performance
Driven by order-level salesperson and full global date-range/filter scope.

KPIs:
1. Sales
2. Orders
3. Active customers in selected period
4. AOV
5. Revenue growth vs documented comparable period
6. Orders growth
7. Customer growth
8. Product/category mix

### Block B — Latest Completed Month Portfolio Health
Driven by customer ownership / retention logic.

KPIs:
1. Previous active portfolio
2. Retained same rep
3. Same-rep retention rate
4. Transferred out
5. Transferred in
6. Lost customers
7. New customers
8. Reactivated customers
9. Lost previous revenue

### Block C — Customer Portfolio
Clearly choose one of:
- selected-period buying customers
- current owned portfolio
- completed-month retention cohort

Do not mix them in one unlabeled table.

### Block D — Trend
Use a documented history rule, for example:
- last 6 completed months + current MTD sales
or
- selected month plus previous 5 months

### Block E — Actions
Daily actions / at-risk / recovery pipeline should use current authorized portfolio and explicit as-of date, separate from sales-period filters where business semantics require it.

---

## Sales Rep 360 audit status

PASS / usable:
- Monthly retention detail classification
- Transfer direction is derivable
- Monthly customer portfolio RPC values reconcile to monthly portfolio summary
- Order-level sales truth is available in canonical sales data

FIX REQUIRED:
- Selected end-date handling
- Global geography/customer/product filter propagation
- Sales attribution vs portfolio ownership separation
- Partial-month retention/lost handling
- Monthly customers vs selected-range customer semantics
- Trend date semantics
- Multi-company identity/scope behavior
- Hard-coded Mona default
- Misleading period labels
