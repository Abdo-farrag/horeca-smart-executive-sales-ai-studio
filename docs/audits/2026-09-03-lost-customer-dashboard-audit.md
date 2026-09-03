# Lost Customer Dashboard Audit

Date: 2026-09-03
Branch: p1/access-control-design-2026-09-03
Status: Audit only. No production changes applied.

## L-001 — Critical: dashboard is not connected to live analytics

`LostCustomerDashboard.tsx` reads `lostCustomers` from `AppContext`.

Current `AppContext` defines:
`const filteredLostCustomers = useMemo(() => [], []);`

and exposes that empty array as `lostCustomers`.

Result:
The Lost Customer Dashboard is currently empty and is not a live management dashboard.

It must not carry a `[Live]` interpretation until connected to governed lost-customer analytics.

## L-002 — Critical: current historical source cannot reliably support >120-day lost classification

Canonical sales source currently starts 2026-06-01 and ends 2026-09-03.

The canonical proposed LOST lifecycle threshold is >120 days since last trusted commercial order.

As of 2026-09-03, the source history is shorter than 120 days.

Required:
- ingest older order history, or
- provide trusted historical last-order date from Odoo/customer history,
- otherwise show `Lost classification unavailable / insufficient history` rather than zero lost customers.

## L-003 — Critical: churn root causes shown in UI have no live evidence source

The view expects fields such as:
- churnReasonAr / churnReasonEn
- recoveryRecommendation
- recoveryStatus

No reviewed live analytics source currently provides verified reasons such as:
- pricing
- delivery delay
- quality issue

Therefore the dashboard must not state a root cause unless it comes from a tracked CRM/service reason, structured lost-reason field, verified survey/contact outcome, or explicitly labeled AI hypothesis.

Required labels:
- Verified Churn Reason
- Suspected Churn Signal
- AI Hypothesis

Never present an AI hypothesis as a verified root cause.

## L-004 — Critical: generated recovery contract contains unauthorized commercial commitments

The current UI contains a prewritten recovery draft that includes examples such as:
- 5% volume discount
- dedicated refrigerated dispatch before 09:00
- 60-day payment terms

These are commercial/credit/logistics commitments and are not supported by reviewed authorization data.

The system must not automatically present them as an approved recovery plan.

Required behavior:
- AI may draft suggested actions only within a policy/approval matrix.
- Discount, credit terms, delivery SLA, free goods, or special logistics require explicit allowed limits and approval authority.
- UI should label draft terms as `Suggested — Requires Approval` unless a rule engine confirms authorization.

## L-005 — High: `lostRevenueYtd` is not a canonical lost-revenue definition

The current component sums `lostRevenueYtd` across records.

The platform now distinguishes:
1. Lost Previous Revenue — historical comparison revenue of finalized lost accounts
2. Revenue At Risk — forward-looking expected monthly exposure
3. Recovery Opportunity — previous 30d vs recent 30d sales gap

`lostRevenueYtd` is ambiguous and should be removed/replaced with explicit governed measures.

Recommended headline metrics:
- Finalized Lost Customers
- Lost Previous Revenue
- Monthly Revenue At Risk from Lost Accounts
- Recoverable Accounts / Recovery Pipeline

## L-006 — High: lost customer ownership must use portfolio ownership, not last-order seller only

Recovery accountability should use a governed owner definition:
- current assigned salesperson if still assigned
- previous owner at loss point for performance accountability
- sales on orders remain attributed to the order salesperson

The screen should expose both where useful:
`Owner at Loss` and `Current Recovery Owner`.

## L-007 — High: finalized monthly loss and operational >120-day loss are related but different

Two valid concepts exist:

### Month-on-month Retention Loss
Customer was active in previous completed month and did not remain active in current completed month, excluding transfers according to retention rules.

### Long-term Lifecycle Lost
Customer has exceeded the approved inactivity threshold (currently >120 days).

These must not be silently merged into one `Lost` count.

Recommended labels:
- `Monthly Portfolio Lost`
- `Long-Term Lost / Churned`

## Required redesign

### Block A — Completed Month Retention Loss
Source: governed monthly retention classification.

Metrics:
- previous active
- retained
- transferred
- monthly lost
- lost previous revenue

### Block B — Long-Term Lost Portfolio
Source: full historical customer lifecycle as-of date.

Metrics:
- >120-day lost customers
- baseline monthly revenue
- revenue at risk / expected monthly exposure
- owner at loss
- current recovery owner
- last order
- days silent

Only activate once historical coverage is sufficient.

### Block C — Recovery Pipeline
Operational actions:
- Not Contacted
- Contacted
- Qualified for Win-back
- Offer Pending Approval
- Offer Sent
- Reactivated
- Not Recoverable / Reason Captured

### Block D — Verified Lost Reasons
Aggregate only structured verified reasons.

Examples:
- Price
- Service/Delivery
- Product Availability
- Quality
- Credit/Payment Terms
- Competitor
- Business Closed
- Seasonal/Temporary
- Unknown

AI can summarize patterns but must not invent reason codes.

## Release gate

Current Lost Customer Dashboard should remain `Pending / Not Live` until:
1. historical coverage supports the lifecycle definition,
2. live lost customer source is connected,
3. lost revenue definitions are canonical,
4. recovery actions respect commercial approval rules,
5. root causes have verified source/provenance.
