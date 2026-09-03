# Dashboard Screen Readiness Matrix

Date: 2026-09-03
Branch: p1/access-control-design-2026-09-03
Status: Audit snapshot. No production changes applied.

## Legend

- LIVE / VERIFIED: live source + audited core numbers
- LIVE / FIX REQUIRED: live source exists but semantics/mapping/UI needs correction
- PENDING: placeholder, empty context, incomplete data quality, or not yet management-ready

| Screen | Status | Key note |
|---|---|---|
| Executive Dashboard | LIVE / FIX REQUIRED | Revenue/orders/customers/AOV verified; fix MTD comparison, retention period, company split, rep attribution |
| Sales Rep 360 | LIVE / FIX REQUIRED | Monthly/selected-period semantics mixed; filters missing in summary; order seller vs portfolio owner must separate |
| Customer Dashboard | LIVE / FIX REQUIRED | Selected-period buyer activity is live, but At Risk/Sleeping/Lost cannot come from buyer-only population |
| Customer 360 | LIVE / FIX REQUIRED | Core live analytics exist; cadence/risk semantics and field mappings need canonicalization |
| Customer Action Center | LIVE / FIX REQUIRED | Live portfolio/action data exists; company ID reversal and mapper mismatches require correction |
| Lost Customer Dashboard | PENDING | AppContext provides empty lostCustomers; no live source connected; commercial recovery drafts unsafe/unverified |
| Product Dashboard | LIVE / FIX REQUIRED | Sales reconciliation 100%; total orders/customers cards double-count across SKUs |
| Product 360 | LIVE / FIX REQUIRED | Core product analytics live; retention semantics need relabel/calendar definition |
| Category Dashboard | PENDING DATA QUALITY | Correctly marked pending; category completeness not approved |
| Area/Territory Dashboard | PENDING | Reads AppContext `areas=[]`; not connected to live geography RPCs; geo quality itself only partial |
| Sales Dashboard | PENDING / PLACEHOLDER | AppContext `orders=[]`; target chart unavailable; Excel button only shows success alert |
| Global Filters | LIVE / FIX REQUIRED | Base cascades audited; dynamic current month bug and Action Center company-ID issue require correction |

## Cross-screen rules now established

1. Default period = Current Month MTD, Africa/Cairo.
2. MTD comparison = same elapsed days of previous calendar month.
3. Finalized retention/loss = latest completed month, not partial current month.
4. Order sales attribution = salesperson recorded on order.
5. Portfolio ownership = current/previous/primary salesperson relationship.
6. Customer sales activity and portfolio health are separate populations.
7. Lifecycle, Risk, Priority, Recovery Opportunity, Revenue At Risk are separate concepts.
8. Buying cadence = distinct purchase dates.
9. Product orders/customers are non-additive across SKUs.
10. Geography requires coverage/quality badges.
11. Missing comparison/data = null/unavailable, never fake zero.
12. Placeholder screens must be visibly Pending, not implied Live.

## Highest-priority correction queue

### P0 correctness
- Dynamic Cairo current-month default
- Executive MTD comparison
- Executive current-month retention false-loss behavior
- Executive company split source
- Sales Rep selected-period summary + full filter propagation
- Customer buyer-only status cards
- Customer Action Center company ID reversal
- Customer Action Center mapper field mismatches
- Product total orders/customers double counts

### P0 safety / trust
- Lost Customer Dashboard recovery terms must not appear as approved commercial commitments
- Fake/placeholder Excel success action must be removed or replaced with real export
- Pending screens must not suggest live verified business data

### P1 analytics quality
- Historical data >120 days for real Lost classification
- Canonical distinct-day buying cadence
- Revenue At Risk baseline from up to last 3 active completed months
- Geo data coverage improvement
- Category data completion

## Recommended next execution sequence

1. Freeze these KPI dictionaries and audit rules as acceptance criteria.
2. Write TDD tests for date semantics and non-additive KPI errors.
3. Correct frontend-only mapping/date bugs that do not require production DDL.
4. Write new/revised RPC migrations for comparison, scoped rep performance, portfolio health, company split, and Revenue At Risk.
5. Review migration set without applying production.
6. Reconcile corrected screens against direct SQL.
7. Only after approval apply Supabase production migrations.
8. Run role-based QA for Admin / Manager / Supervisor / Sales Rep.
