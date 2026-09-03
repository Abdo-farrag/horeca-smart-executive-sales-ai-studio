# Customer Lifecycle, Risk & Revenue-at-Risk Dictionary

Date: 2026-09-03
Status: Proposed canonical business definitions from live audit. No production changes applied.

## 1. Separate concepts

The platform must not use one label to represent all customer-health concepts.

### A. Lifecycle / Recency Status
Question: `How long has it been since this customer last purchased?`

### B. Risk Level
Question: `How likely is this customer's expected business to deteriorate or churn?`

### C. Action Priority
Question: `How urgently should the commercial team act?`

### D. Recovery Opportunity
Question: `How much short-term revenue has declined versus the immediately previous 30-day period?`

### E. Revenue At Risk
Question: `How much expected monthly customer revenue is currently exposed based on the customer's normal run rate?`

These five concepts must remain separate in SQL, SDK, UI, exports, and AI.

---

# 2. Lifecycle / Recency Status

Population:
All customers with trusted commercial purchase history up to the `as_of_date`, not only buyers inside the selected period.

## NEW
A customer whose first-ever trusted commercial order occurs in the current reporting acquisition window.

For portfolio reporting, the UI must state the acquisition window explicitly (for example Current MTD).

## ACTIVE
Customer has purchase history and:
`days_since_last_order <= 30`

A customer can still be ACTIVE but carry MEDIUM/HIGH risk due to sales decline or cadence overdue signals.

## AT_RISK
Recency definition:
`31 <= days_since_last_order <= 60`

Risk signals can also flag an ACTIVE customer for action without changing the lifecycle label.

## SLEEPING
`61 <= days_since_last_order <= 120`

## LOST
`days_since_last_order > 120`

Historical coverage requirement:
Do not claim a customer is not LOST if the trusted source does not contain at least 120 days of historical purchase coverage or a trusted pre-window last-order date.

Current source limitation on 2026-09-03:
`sales_orders_odoo18` begins 2026-06-01, therefore >120-day loss cannot yet be inferred reliably from that source alone.

---

# 3. Buying Cadence

Canonical cadence grain:
Distinct Purchase Dates, not individual orders.

Reason:
Multiple orders on the same day represent one purchase day for reorder-cycle estimation and must not create zero-day buying intervals.

Metrics:
- active_purchase_days
- average_days_between_purchase_days
- median_days_between_purchase_days
- expected_next_order_date = last_order_date + median interval
- overdue_days = max(days_since_last_order - expected_interval, 0)

Cadence confidence:
- HIGH: >= 5 distinct purchase dates
- MEDIUM: 3–4 distinct purchase dates
- LOW: < 3 distinct purchase dates

If cadence confidence is LOW, cadence should not independently trigger a high-risk label.

---

# 4. Risk Level

Risk is an overlay on lifecycle and must use several signals.

## LOST RISK
Lifecycle = LOST.

## HIGH RISK
Any strong signal such as:
- Lifecycle = SLEEPING
- Recent 30-day sales decline >= 50% vs previous 30 days, when previous baseline is meaningful
- Days since last order materially exceeds buying cycle, for example >= 2x median purchase interval with sufficient cadence confidence
- Major expected revenue exposure above an agreed commercial threshold

## MEDIUM RISK
Examples:
- Lifecycle = AT_RISK
- Recent 30-day sales decline between 25% and 50%
- Customer is late versus normal buying cadence, e.g. >=1.5x median interval with sufficient cadence confidence

## LOW RISK
No strong lifecycle, decline, or cadence signal.

Important:
Lifecycle and Risk can differ.
Example: ACTIVE + HIGH RISK when the customer bought recently but purchasing value has collapsed materially.

---

# 5. Action Priority

Priority is operational, not a synonym for risk.

## HIGH PRIORITY
Examples:
- LOST/SLEEPING high-value account
- High Risk + high Revenue At Risk
- Major 30-day recovery gap
- strategic customer overdue versus buying cycle

## MEDIUM PRIORITY
Examples:
- At Risk with moderate exposure
- cadence overdue with meaningful account value
- moderate declining sales

## LOW PRIORITY
Routine monitor / low financial exposure.

Recommended prioritization inputs:
1. lifecycle severity
2. risk severity
3. revenue at risk
4. recovery opportunity
5. cadence overdue
6. strategic/ABC class when available

---

# 6. Recovery Opportunity

Definition:
Short-term sales gap between the previous 30-day period and the recent 30-day period.

Formula:
`MAX(previous_30d_sales - recent_30d_sales, 0)`

Use:
Operational recovery / sales-gap queue.

Do not call this Revenue At Risk.

Audited current Action Center total on 2026-09-03:
EGP 28,199,593.87.

This is a 30-day recovery gap, not a normalized portfolio revenue-risk value.

---

# 7. Expected Monthly Revenue Baseline

Canonical baseline for Revenue At Risk:

1. Use the most recent 3 completed ACTIVE months before the as-of/current month.
2. Include only months in which the customer had commercial sales > 0.
3. `baseline_monthly_revenue = average(monthly_sales of up to last 3 active completed months)`.
4. If fewer than 3 active completed months are available, use the average of available active completed months and expose a lower `baseline_confidence`.
5. If no completed active month exists, Revenue At Risk is unavailable rather than forced to zero.

Confidence:
- HIGH: 3 active completed months
- MEDIUM: 2 active completed months
- LOW: 1 active completed month
- UNAVAILABLE: 0

---

# 8. Revenue At Risk

Revenue At Risk should represent expected monthly revenue exposure, not historical lost sales and not merely a 30-day decline.

Recommended version 1 formula:

`baseline = avg(last up to 3 active completed months)`

`recent_run_rate = sales in latest rolling 30 days up to as_of_date`

For customers with risk/lifecycle signal:
`revenue_at_risk = MAX(baseline - recent_run_rate, 0)`

For finalized LOST customers with sufficient history:
`revenue_at_risk = baseline`

For LOW-risk customers:
Revenue At Risk can remain zero unless another validated exposure signal exists.

This produces a monetary exposure tied to normal customer run rate.

Do not sum Revenue At Risk for customers with unavailable/insufficient baseline without showing a coverage/confidence indicator.

---

# 9. Revenue At Risk vs Lost Previous Revenue

## Revenue At Risk
Forward-looking expected monthly exposure.

## Lost Previous Revenue
Historical revenue from a previous comparison period for customers subsequently classified lost.

Both are useful, but answer different questions.

---

# 10. Reactivated Customer

Definition:
Customer has a current purchase after a meaningful inactive period / prior inactive classification and is not a first-time buyer.

For month-on-month retention logic, use the governed `REACTIVATED` classification.

Do not classify any returning historical customer as NEW merely because they had zero sales in the immediately prior period.

---

# 11. Transfer

Customer transfer is portfolio ownership movement, not customer churn.

- Transfer Out: previous owner = rep A, current owner = rep B
- Transfer In: current owner = rep B, previous owner = rep A
- Company Retention: transfer counts as retained at company level
- Same-Rep Retention: transfer does not count as retained by previous rep

Order-level sales attribution remains based on salesperson recorded on each order.

---

# 12. Customer Dashboard structure

## Block A — Selected Period Customer Sales Activity
Population: customers who bought in selected period.

Metrics:
- Buying Customers
- New Customers in Period
- Revenue
- Orders
- AOV
- Period sales change
- Product activity

Do not show portfolio At Risk/Sleeping/Lost counts here.

## Block B — Portfolio Health as of Date
Population: full trusted portfolio.

Metrics:
- Active
- At Risk
- Sleeping
- Lost (only when historical coverage is sufficient)
- High/Medium/Low Risk
- Revenue At Risk
- Recovery Opportunity
- Overdue vs Cadence

## Block C — Operational Action Queue
Priority/action-oriented list from Action Center.

---

# 13. Customer 360 structure

## Selected Period Performance
- Revenue
- Orders
- AOV
- Products
- period order history

## Historical Profile
- first trusted order
- last order
- lifetime sales/orders under available historical scope
- ownership history

## Buying Cadence
- distinct purchase dates
- median interval
- expected next order
- overdue status
- confidence

## Risk & Exposure — As Of
- Lifecycle
- Risk
- Action Priority
- Recent 30d
- Previous 30d
- Recovery Opportunity
- Revenue At Risk
- baseline confidence

The date for recency/risk must be effectiveEndDate or explicit as_of_date, never unavailable future month-end.

---

# 14. Data quality badges

Customer health reporting should expose:
- history_start_date
- as_of_date
- lost_classification_available boolean
- revenue_baseline_coverage / confidence
- cadence_confidence

This prevents management from treating incomplete history as a genuine zero-risk or zero-lost result.
