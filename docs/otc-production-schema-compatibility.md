# OTC production contract compatibility — read-only check

Checked on 2026-10-08 against the existing Supabase project using **read-only** `information_schema`, `pg_proc` and `pg_class` queries. No production migrations, Edge Function deploys or sync were performed.

## Existing reconciliation view

`public.otc_sale_line_reconciliation_v1` currently exposes **47 columns**. Its column names, ordinal positions and PostgreSQL types are mirrored by `tests/sql/otc/01_existing_contract.sql`, which is created **before** the new migrations in the isolated PostgreSQL 17 GitHub Actions job. This tests `CREATE OR REPLACE VIEW` against an existing view, rather than testing only first-time creation.

The existing production view has `security_invoker=true`. The migration preserves that setting.

## Existing RPC contracts

- `analytics_order_to_cash_kpis_v1`: 11 input arguments; table result includes order, delivery, return, invoice, gaps and link confidence metrics.
- `analytics_order_to_cash_trend_v1`: 12 input arguments; table result includes period/date basis and gross/net delivery/invoice measures.
- Both existing production functions are `SECURITY DEFINER`. The test fixture creates functions with the same signatures and return columns before the migrations, so PostgreSQL rejects incompatible return type changes.

The actual production tables contain the source fields used by these migrations, including `product_sales_from_june1.order_date` as `timestamptz`, and `otc_invoice_lines.invoice_date` as `date`. The test fixture deliberately covers referenced columns, not every production column or constraint.

## Security

The production reconciliation view and OTC event tables are granted to `service_role` rather than directly to `authenticated` or `anon`. The test suite checks new dimension table privileges, and an authenticated SQL role is denied execution of privileged geography refresh functions. The test's `auth.uid()` and `auth.role()` are synthetic stand-ins; **this is not a live Supabase JWT/RLS audit**.

## What this does not establish

- Whether Odoo `sale.order.partner_shipping_id` and return origins resolve correctly on real data.
- Whether `sales_orders_odoo18_secure` remains fast under real volume.
- Whether the production warehouse, invoice and return totals reconcile.
- Whether production extensions, dependencies, permissions, or data distribution expose a runtime issue not present in the synthetic baseline.

Keep PR #11 in Draft; require a real authenticated Dry Run and finance signoff before merging or deploying.
