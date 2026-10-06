# Order-to-Cash & Returns Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure Order-to-Cash & Returns Control Layer that reconciles every `sale.order.line` through ordered, delivered, returned, invoiced and credited states without mixing operational and accounting dates.

**Architecture:** Keep `sale.order.line` as the ordered source, add three idempotent Odoo snapshot facts for delivery, return and invoice/refund events, reconcile at sales-order-line grain, and expose only scoped SECURITY DEFINER RPCs to the application. Start with dry-run relation coverage, then snapshots/sync, then reconciliation RPCs, then the dedicated control page, and only after reconciliation add compact 360 cards.

**Tech Stack:** Supabase Postgres/RLS/RPC, Supabase Edge Functions (Deno/TypeScript), Odoo 18 JSON-RPC, React 19 + TypeScript + Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-order-to-cash-returns-control-design.md`

## Global Constraints

- Ordered source is `sale.order.line` using `date_order`.
- Delivery and return quantities come from completed stock moves using their own completion/receipt dates.
- Invoice and credit-note values come only from posted accounting moves using accounting dates.
- Stock returns and credit notes remain separate events.
- Primary reconciliation grain is `sale.order.line`; indirect relations must store `link_confidence` as `direct`, `inferred`, or `unmatched`.
- No raw OTC source table may be read by the browser; UI uses secure RPCs only.
- RLS on every new snapshot table; no public/anon write policies.
- Sync is idempotent, logs to `sync_logs`, and performs no historical hard deletes in V1.
- Companies are limited to Odoo company IDs 1 and 2.
- Do not modify Procurement UI or unrelated features.
- Use TDD and regression contracts before implementation.

## Review Focus

- `account.move.line.sale_line_ids` can contain zero, one or multiple sale lines; multi-link financial allocation must not be silently guessed.
- `stock.move.sale_line_id` availability/coverage must be measured before treating delivery linkage as direct.
- A return with no posted refund must remain operationally returned but financially uncredited.
- Date-basis filtering must not mix order, delivery, return, invoice and credit-note dates.
- Salesperson scope must use stable `salesperson_id`, not name matching, when enforcing authorization.

---

### Task 1: Contract and relation-discovery gate

**Files:**
- Create: `tests/business-rules/order-to-cash-returns-control-contract.mjs`
- Modify: `package.json`
- Create: `supabase/functions/sync-odoo18-order-to-cash/index.ts`

**Interfaces:**
- Consumes: Odoo models `stock.picking`, `stock.move`, `account.move`, `account.move.line`.
- Produces: Edge Function modes `dry_run` and `sync`; dry-run relation coverage JSON with delivery direct-link, return original-move-link, invoice single/multi sale-line counts.

- [ ] Write the failing contract that requires snapshot migrations, secure RPC names, RLS, `link_confidence`, no hard delete, and no frontend raw-table reads.
- [ ] Run contract and confirm RED because OTC implementation files do not exist yet.
- [ ] Implement dry-run relation discovery first; no Supabase snapshot writes in `dry_run`.
- [ ] Add tests proving `dry_run` reports `stock.move.sale_line_id` availability and invoice multi-link counts.
- [ ] Run targeted and full contract/unit suites.

### Task 2: Snapshot schema and RLS

**Files:**
- Create: `supabase/migrations/20261003010000_otc_snapshot_foundation.sql`

**Interfaces:**
- Produces: `otc_delivery_lines`, `otc_return_lines`, `otc_invoice_lines` with immutable Odoo keys, stable scope fields, event dates, source state, `link_confidence`, sync timestamps and indexes.

- [ ] Add RED SQL/contract assertions for exact tables, unique Odoo keys, indexes and RLS.
- [ ] Implement the migration with no anon/public direct table access and no public write policies.
- [ ] Verify migration history/contract tests remain green.

### Task 3: Idempotent sync

**Files:**
- Modify: `supabase/functions/sync-odoo18-order-to-cash/index.ts`
- Test: `tests/business-rules/order-to-cash-returns-control-contract.mjs`

**Interfaces:**
- Consumes: snapshot tables from Task 2.
- Produces: idempotent upserts and `sync_logs` entries for deliveries, returns and invoice/refund lines.

- [ ] Add RED tests for upsert keys, `sync_logs`, company restriction `[1,2]`, posted accounting state, done stock state, and no `.delete(` path.
- [ ] Implement minimal sync paths and linkage confidence assignment.
- [ ] Verify repeated-sync behavior is structurally idempotent and all tests pass.

### Task 4: Reconciliation and secure RPCs

**Files:**
- Create: `supabase/migrations/20261003020000_otc_secure_rpcs.sql`

**Interfaces:**
- Produces: `analytics_order_to_cash_kpis_v1`, `analytics_order_to_cash_trend_v1`, `analytics_returns_exception_queue_v1`, `analytics_customer_order_to_cash_v1`, `analytics_sales_rep_order_to_cash_v1`, `analytics_product_order_to_cash_v1`.

- [ ] Add RED SQL contracts for formulas, date basis, auth scope and no raw exposure.
- [ ] Implement sale-order-line reconciliation, including Net Delivered and Net Invoiced formulas.
- [ ] Enforce requested filters intersected with `authorized_company_ids()` / `authorized_salesperson_ids()` and fail closed.
- [ ] Add regression scenarios for partial delivery, partial return, partial invoice, uncredited return and refund-without-stock-return.
- [ ] Run full contracts and unit tests.

### Task 5: Order-to-Cash & Returns Control page

**Files:**
- Create: `src/analytics/orderToCash.ts`
- Create: `src/services/orderToCashService.ts`
- Create: `src/views/OrderToCashReturnsControl.tsx`
- Modify: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/access/viewCapabilities.ts`
- Mirror app-facing files into `apps/lovable` and `apps/studio` where parity requires it.

**Interfaces:**
- Consumes: secure RPCs from Task 4 only.
- Produces: flow KPIs, explicit Date Basis trend, gap cards, exception queue and line-level reconciliation drilldown.

- [ ] Add RED SDK/UI contracts proving there are no `.from('otc_*')` browser reads and all filters propagate.
- [ ] Implement typed RPC adapters and the new page.
- [ ] Add role-view access consistent with existing RBAC.
- [ ] Run unit, typecheck, build and parity tests.

### Task 6: Reconciliation evidence and 360 cards

**Files:**
- Modify only after KPI reconciliation passes: Executive, Customer 360, Sales Rep 360 and Product 360 views/adapters.

**Interfaces:**
- Consumes: reconciled drilldown RPCs.
- Produces: compact OTC cards on existing dashboards.

- [ ] Record Finance invoice/credit-note reconciliation and Warehouse delivery/return reconciliation for an agreed test period.
- [ ] Keep 360 cards blocked until acceptance tolerances pass.
- [ ] Add compact cards using existing secure drilldowns, not duplicate calculations.
- [ ] Run full CI and prepare the isolated PR; do not touch Procurement.
