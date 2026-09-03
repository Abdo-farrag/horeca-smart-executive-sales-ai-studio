# Customer Layer Audit — Dashboard, Customer 360, Action Center

Date: 2026-09-03
Branch: p1/access-control-design-2026-09-03
Status: Audit only. No production migration or correction applied.

## Scope

Reviewed:
- Customer Dashboard
- Customer 360
- Customer Action Center
- Customer summary/status semantics
- Risk / buying frequency
- Recovery opportunity
- Company/salesperson filtering

## C-001 — Critical: Customer Dashboard status population is buyer-only

`analytics_customer_summary_v2` starts from orders inside the selected period and therefore includes only customers who purchased inside that period.

It then assigns `NEW / ACTIVE / AT_RISK / SLEEPING / LOST` to those returned buyers.

This means customers who did not buy during the selected period are absent from the population and cannot appear as At Risk, Sleeping, or Lost even when they should.

Audited 2026-09-01..03:
- ACTIVE: 106
- NEW: 8
- AT_RISK: 0
- SLEEPING: 0
- LOST: 0

This does not mean there is no customer risk. It means the summary is a selected-period buyer list.

Action Center as of 2026-09-03 sees a wider portfolio:
- HIGH risk: 148
- MEDIUM risk: 212
- LOW risk: 386

Required separation:
- Customer Sales Activity = buyers in selected period
- Customer Portfolio Health = full historical portfolio as of an operational date

Do not calculate portfolio At Risk/Lost KPIs from the selected-period buyer table.

## C-002 — Critical: insufficient history for >120-day Lost classification

Canonical `sales_orders_odoo18` currently covers:
- Min date: 2026-06-01
- Max date: 2026-09-03
- Orders: 4,457

The Action Center defines LOST as `days_since_last_order > 120`.

On 2026-09-03 the available sales history is shorter than 120 days, so the action-center `lost_customers = 0` is not evidence that no customers are lost.

Required rule:
- Either load historical last-order/order data beyond June 1,
- or source last purchase from a trusted historical Odoo customer/order layer,
- otherwise label >120-day Lost as `insufficient historical coverage` until the window is mature.

## C-003 — Critical: Customer Action Center company IDs are reversed in UI filter option loading

`CustomerActionCenter.tsx` currently maps:
- Horeca Smart -> companyId 1
- MAS -> companyId 2

Live canonical mapping is:
- MAS -> 1
- Horeca Smart -> 2

Verified salesperson options:
- company_id 1: Amgad Ahmed, Haddil Haron (MAS)
- company_id 2: Horeca Smart reps

Impact:
Selecting a company in Action Center can load the opposite company's salesperson option list.

## C-004 — High: portfolio-summary mapper field-name mismatch

SQL `analytics_customer_portfolio_summary` returns:
- total_customers
- high_priority_customers
- medium_priority_customers
- low_priority_customers
- lost_customers
- win_back_customers
- declining_customers
- overdue_customers
- owner_transfer_customers
- total_recovery_opportunity
- high_priority_recovery_opportunity

The SDK mapper searches for different aliases for high/medium/low priority and therefore may map valid live counts to zero.

Audited raw values as of 2026-09-03:
- Total customers: 746
- High priority: 127
- Medium priority: 224
- Low priority: 395
- Lost (>120 by current source): 0 — not reliable due C-002
- Win-back: 242
- Declining: 118
- Overdue: 32
- Owner transfer review: 3
- Total recovery opportunity: EGP 28,199,593.87
- High-priority recovery opportunity: EGP 23,148,529.78

## C-005 — High: risk-distribution percentage mapper mismatch

SQL returns `share_pct`.
SDK mapper does not currently read `share_pct`.

Raw audited distribution:
- HIGH: 148 customers / 19.84%
- MEDIUM: 212 / 28.42%
- LOW: 386 / 51.74%

Impact:
Risk distribution counts can be correct while percentages display as zero/unavailable.

## C-006 — High: buying-cycle field-name mismatch and calculation inconsistency

Action Center SQL returns `median_days_between_orders`.
Several SDK mappers search for `median_buying_interval` / `median_interval`, causing the median value to resolve to zero.

Additionally, `analytics_customer_risk` and `analytics_customer_buying_frequency` calculate gaps between individual orders rather than distinct purchase dates. Multiple orders on the same date create zero-day gaps.

Sample customer 30709 / MAS, 2026-06-01..2026-09-03:
- Orders: 66
- Active purchase days: 28
- Existing RPC average gap: 1.40 days
- Existing RPC median gap: 0 days

Correct distinct-purchase-date calculation:
- Average gap: ~3.37 days
- Median gap: 2 days

Required standard:
Buying cadence must be calculated from distinct purchase dates, not multiple order records placed on the same calendar day.

## C-007 — Critical: Customer 360 uses selected dateRange rather than effective data window

`Customer360Panel.tsx` derives:
- startDate = filters.dateRange.startDate
- endDate = filters.dateRange.endDate

It does not use `effectiveStartDate/effectiveEndDate`.

For Current Month, selected end can be the calendar month-end while available data stops earlier.

Sample customer 30709, September:
- Effective end 2026-09-03 -> days since last order = 1
- Selected end 2026-09-30 -> days since last order = 28
- Period sales/orders remain the same because future rows do not exist

Impact:
Recency, customer status, and risk interpretation can be shifted into the future even though revenue stays unchanged.

Required correction:
All as-of/recency/customer-status calculations use effectiveEndDate or explicit as-of date, never an unavailable future selected end.

## C-008 — High: Customer 360 and Risk use inconsistent status/risk systems

Customer Summary / Customer 360 status thresholds:
- <=30 ACTIVE
- <=60 AT_RISK
- <=120 SLEEPING
- >120 LOST

Customer Action Center risk:
- >120 LOST
- >60 HIGH
- >30 MEDIUM
- plus recent-vs-previous 30-day decline signals

`analytics_customer_risk` uses another hybrid rule with median-cycle thresholds and decline percentages.

Therefore one customer can have:
- one `customer_status`
- another `risk_level`
- another Action Center priority

This can be valid only if each term is deliberately separate and labeled. It is currently too easy to interpret them as one churn status.

Required vocabulary:
- Lifecycle/Recency Status
- Risk Level
- Action Priority

Never use these interchangeably.

## C-009 — High: Recovery Opportunity is not Revenue At Risk

Current Action Center:
`recovery_opportunity = max(previous_30d_sales - recent_30d_sales, 0)`

This is a 30-day sales-gap recovery signal.

It is not the approved management concept of Revenue At Risk based on expected customer run-rate / recent active-month baseline / buying cycle.

Required separation:
- Recovery Opportunity = short-term 30d sales gap
- Revenue At Risk = expected revenue exposure based on customer baseline and risk/overdue logic

These must be separate fields, cards, exports, and AI concepts.

## C-010 — Medium: Customer 360 buying-frequency service ignores selected date range

The buying-frequency RPC supports `p_start_date` and `p_end_date`, but the current SDK call sends only customer + company, causing defaults to be used.

Current SQL default start is 2026-06-01 and default end is current_date.

Therefore the Buying Frequency tab is not necessarily the same time scope as other Customer 360 period tabs.

Recommendation:
- Lifetime/canonical cadence should use a clearly defined historical window.
- Selected-period sales should stay separate.
- Label the cadence window explicitly.

## C-011 — Medium: Customer Action Center as-of date semantics are conceptually correct

The Action Center uses a dedicated `asOfDate`, defaulting to latest available sales data date.

This is the correct concept for operational risk and recovery analytics and should remain separate from historical sales date-range filters.

However, it must be protected by RBAC and company/salesperson scope server-side.

## Current raw Action Center baseline — 2026-09-03

Portfolio size: 746 customers.

Risk distribution:
- High: 148
- Medium: 212
- Low: 386

Recovery gap:
- Total: EGP 28.20M
- High-priority: EGP 23.15M

These are useful operational metrics after mapper and historical-coverage corrections.

## Required architecture

### Customer Sales Activity
Selected period, order-based:
- buying customers
- revenue
- orders
- AOV
- first-time buyers in period
- product/basket activity

### Customer Portfolio Health
As-of date, historical portfolio:
- lifecycle/recency
- risk
- buying cycle overdue
- sales decline
- recovery opportunity
- revenue at risk
- owner transfer

### Customer 360
Clearly split:
1. Selected Period Performance
2. Historical Customer Profile
3. Buying Cadence
4. Risk & Portfolio Health as-of date
5. Product behavior
6. Orders
7. Salesperson ownership history

## Next checks

1. Define canonical customer lifecycle and risk dictionary
2. Define Revenue At Risk formula
3. Validate Customer 360 period/lifetime numbers on representative sample customers
4. Validate Action Center company/salesperson filters after correcting ID mapping
5. Review Lost Customer Dashboard against the same canonical rules
