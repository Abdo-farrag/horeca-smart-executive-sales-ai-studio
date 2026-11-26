# Returns Intelligence & Audit — Order Cohort V1

**Status:** Proposed backend + release-gated UI implementation. **Not deployed**. Root, Studio and Lovable implementations are on a feature branch. No Production SQL has been executed.

## Business semantics

An October 2026 **Order Cohort** is the population of orders whose original **order creation date in Africa/Cairo** is October 1–31, not returns recorded in October. Every movement and document linked to those orders belongs to the cohort's lifetime (including returns received in November). Incomplete latest-period data should show an evidence warning, **never zero-sales claims**.

The displayed period's orders include orders without returns, because the denominator for "% orders returned" is all distinct eligible orders. For a later-period return belonging to an October order, attribute the return value back to the October cohort, retaining the actual November return receipt timestamp for drill-down.

**Optional separate mode later:** Return Event Date, which answers "what returned this month" and is not comparable to Order Cohort denominators. Never silently blend the two modes.

### Source-of-truth grain

- Canonical ordered record: `public.otc_sale_line_reconciliation_canonical_v1` (one sale order line, *not* one order).
- A cohort order is uniquely (`company_id`, `order_id`) and **must** be aggregated from individual `sale_order_line_id` rows without multiplying totals through joins to multiple delivery/return/credit-note events.
- Details: sale lines (ordered, gross delivered, returned, net delivered, invoiced, credited), source stock.move delivery/return events grouped by exact `sale_order_line_id` and their own timestamps, and original `origin_returned_move_id`.
- Order identity must come from original order date and company; salesperson and customer sourced from the same order line snapshot (or explicit historical salesperson attribution), not merely today's customer assignment.
- Some returns have no sale-order-line link. They **must not** be placed under an arbitrary order; display them as a separate unlinked-evidence queue, and exclude them from falsely confident cohort order totals. Display coverage limitations and potential missing original moves.
- UoM not yet certified; do not compare mixed source quantities as proof of fraud/error.
- Candidate flags: missing original movement in snapshot, unverified link, duplicate-looking move pair (not a duplicate ID), raw excess quantity with UoM unverified, and pending credit note. They remain *review candidates*.
- `return_value_rate_pct = 100 × cohort returned estimated operational value / cohort gross delivered value` **only if** value bases are compatible and valid. Do **not** divide return value by ordered value and call it a traditional return rate. For this V1 design, a return-to-ordered-value ratio is a different, explicitly labeled commercial metric and should be NULL if values aren't comparable.
- `order_return_incidence_pct = 100 × unique cohort orders with linked returns / all cohort orders`. Count each order once, including ones with multiple return moves.
- Values must distinguish operational estimates from final accounting and credit notes. No negative credit note double deduction from net delivered value.

## Staged RPC contract (NOT CREATED IN PRODUCTION)

1. `public.analytics_returns_cohort_dashboard_v1(p_start_date date,p_end_date date,p_company_id bigint,p_search text,p_status text,p_limit integer,p_offset integer) returns table(payload jsonb)`
   - `payload.summary`: `order_count`, `orders_with_returns`, `ordered_value`, `delivered_value`, `net_delivered_value`, `credited_value`, `returned_value`, `return_order_rate_pct`, `return_value_rate_pct` (nullable), `flagged_orders`, `unlinked_return_moves`, `snapshot_through`.
   - `payload.orders`: paginated *distinct orders*, with `company_id`, `order_id`, `order_name`, `customer_id`, `customer_name`, `salesperson_name`, `order_date`, `ordered_value`, `delivered_value`, `returned_value`, `credited_value`, `return_events`, `last_return_at`, `line_count`, `review_flags`, `review_status`. Sorted by most severe review flag then return value; tie-break by company and order IDs.
   - `payload.total_rows` must count all orders matching filters **before pagination**.
   - `status='all'|'returned'|'flagged'`; filters search exact/ILIKE order number and customer name; period max 366 days, page up to 40, offset <= 10,000. Server-side pagination; no unbounded `jsonb_agg`.
   - Cohort totals should be independent of page and search filter unless explicitly labeled "filtered results"; summary and table must state consistent population.

2. `public.analytics_returns_cohort_order_detail_v1(p_company_id bigint,p_order_id bigint) returns table(payload jsonb)`
   - Return **one authorized order only** with `lines`, `returns`, `notes`.
   - `lines`: `sale_order_line_id`, `product_name`, `ordered_qty`, `delivered_qty`, `returned_qty`, `ordered_value`, `delivered_value`, `returned_value`, `invoice_value`, `credit_note_value`, `link_evidence`, `uom_status`.
   - `returns`: distinct `odoo_return_move_id`, `origin_returned_move_id`, receipt date, quantity, reason, link confidence and source status; order line match required. Do not expose records linked by inference as if they were verified.
   - `notes`: explanations for missing original delivery, unverified UoM, incomplete snapshots and invoice/credit-note lifecycle.
   - Cap lines and return events, returning explicit "incomplete" metadata rather than silently truncating.

**Security gates:** These RPCs are manager/admin only, require `auth.uid()` with an active `public.app_user_roles` profile, require company in `public.authorized_company_ids()`, and enforce company + order in *every subquery*. Use pinned `search_path`, revoke PUBLIC/anon execute and grant authenticated only after verifying authorization. NO direct browser reads from `otc_delivery_lines`/return/invoice source tables. Current broad `customer360_authenticated_read` SELECT policies without company predicates remain a separate high-priority Production risk. Their RLS tightening must be planned with real JWT and Customer360 regression in a safe environment.

## UI

New sidebar item **مركز مراجعة المرتجعات**, isolated from Order-to-Cash overview; manager/admin permissions in the primary app. Page has controls and summary, per-order table, inline expandable line-detail / linked return movement list, review flags and evidence coverage copy. Global company/date values provide defaults and can be overridden inside the page.

**Feature Flag:** `VITE_RETURNS_REVIEW_CENTER_ENABLED === 'true'` is **disabled by default** in root/Lovable/Studio. Do not enable until both RPCs are implemented, deployed with real-JWT role/company tests and source validation, including Odoo UoM and timing. The flag is UX release control, NOT an authorization boundary.

## Release checks

1. New RPCs exist only after a reviewed migration is generated and staged. No placeholder or fake Production data.
2. Include cross-company role tests for MAS/Horeca Smart, manager/admin, inactive user, supervisor, sales rep, anon and malformed filters.
3. Order-level totals reconcile with existing `analytics_order_to_cash_kpis_v1` **for identical cohort population and value basis**, including returns posted after the original order month and orders with no return.
4. Expose and test 242 prior observed missing-original-delivery snapshot cases as data-quality evidence, not 242 confirmed mistakes.
5. Validate per-order review candidates against original Odoo source, warehouse return documents and Finance credit notes. Keep manual review states versioned with actor and timestamp using existing proposed review audit workflow, but do not auto-approve or label fraud.
6. Validate bounded pagination, date boundaries in Cairo, partial cohort maturity, refund/credit-note timing, and export scope.
7. Keep existing Order-to-Cash KPIs and filters unchanged. Do not auto-merge, deploy, or re-create paid staging without user approval.

## Readiness update — reproducible PostgreSQL verification

The isolated GitHub Actions PostgreSQL 17 suite now creates a source-shaped canonical order-line reconciliation fixture, applies the **proposal SQL** without touching Production, and tests:
- October orders with returns received in November stay in October's cohort.
- Multi-movement joins cannot duplicate monetary sums (synthetic company-one exact totals: ordered 170, gross delivered 150, returns 50, net delivered 100, credited 20).
- Exact numeric order ID overlap between two companies does not allow cross-company detail access.
- Active manager authorization and company scope; sales rep, inactive staff, anon are denied.
- Dashboard summary remains the **full company/date cohort**, independent of status/search filters; pagination count/table respond to those filters. Do not relabel the summary as filtered search results.
- UI uses `company_id:order_id` as its selection key, ignores out-of-order detail responses, and verifies returned detail identity.
- Review statuses remain `not_available` until a real versioned review record source exists.

This **synthetic CI acceptance is not real-JWT browser UAT, source Odoo completeness, approved RLS remediation, or deployment**. The new RPCs remain proposals only. The paid staging branch was deleted before this work, and was not recreated.
