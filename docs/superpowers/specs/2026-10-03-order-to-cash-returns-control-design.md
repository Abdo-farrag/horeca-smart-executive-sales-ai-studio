# Order-to-Cash & Returns Control Layer

## Objective

Give Horeca Smart a trustworthy view of the commercial journey for every sales-order line:

`Ordered → Gross Delivered → Returned → Net Delivered → Gross Invoiced → Credit Note → Net Invoiced`

The layer must work by company, sales representative, customer, product, brand/category, area, and date while separating operational and accounting dates.

## Approved business rules

1. Ordered quantity/value is measured from the sales order using `date_order`.
2. Gross delivered quantity/value is measured from completed outgoing stock moves using the delivery completion date.
3. Returned quantity/value is measured from completed customer-return stock moves using the warehouse receipt date.
4. Net delivered equals gross delivered minus returned quantity/value.
5. Gross invoiced quantity/value is measured from posted customer invoices using invoice date.
6. Credit notes are measured from posted customer refunds using credit-note date.
7. Net invoiced equals gross invoiced minus posted credit notes.
8. A stock return and a credit note are separate events. A return affects Net Delivered when received; it affects Net Invoiced only when its credit note is posted.

## Data model

### Existing ordered-sales source

`sale.order.line` is already synchronized in the sales layer. It remains the ordered source and supplies the sales-order line key, company, customer, salesperson, product, ordered quantity, ordered amount and order date.

### New source snapshots

`otc_delivery_lines`

- One row per completed outgoing Odoo stock move.
- Stores picking/move IDs, sales-order-line relation, company, customer, product, delivery date, delivered quantity, delivered value where available, source state and sync timestamp.

`otc_return_lines`

- One row per completed customer-return Odoo stock move.
- Stores return-picking/move IDs, original delivery-move relation, sales-order-line relation when available, company, customer, product, return-receipt date, returned quantity, estimated operational value, reason when available, source state and sync timestamp.

`otc_invoice_lines`

- One row per posted Odoo invoice or credit-note line associated with a product/sales-order line.
- Stores move/line IDs, move type (`out_invoice` or `out_refund`), company, customer, salesperson where available, product, sales-order-line relation, invoice date, quantity, untaxed/total values, currency, state and sync timestamp.

Each source keeps immutable Odoo identifiers and uses upsert by its Odoo line/move ID. No operational or accounting data is edited by the dashboard.

## Reconciliation views and metrics

The reporting view joins facts at sales-order-line grain where a direct relation is present. If a direct relation is absent, a documented fallback may use original return move, customer, product, company and date window, marked with `link_confidence = inferred`.

| Metric | Formula | Date dimension |
| --- | --- | --- |
| Ordered Qty/Value | sales-order line quantity/amount | order date |
| Gross Delivered Qty/Value | completed outbound moves | delivery date |
| Returned Qty/Value | completed customer-return moves | return receipt date |
| Net Delivered Qty/Value | gross delivered − returned | operational date range |
| Gross Invoiced Qty/Value | posted `out_invoice` lines | invoice date |
| Credit Note Qty/Value | posted `out_refund` lines | credit-note date |
| Net Invoiced Qty/Value | gross invoiced − credit notes | accounting date range |
| Delivery Gap | ordered − gross delivered | order-cohort view |
| Invoice Gap | gross delivered − gross invoiced | delivery/invoice reconciliation |
| Return Rate | returned ÷ gross delivered | return receipt date |
| Uncredited Returns | accepted returns not yet matched to posted credit note | as-of date |

Values are not mixed across date dimensions in daily trends. Cohort reporting is explicitly labeled as order-date cohort, delivery-date performance, or invoice-date performance.

## API and UI

New secure RPCs, rather than direct table reads, will power the UI:

1. `analytics_order_to_cash_kpis_v1` — scoped executive KPIs and gaps.
2. `analytics_order_to_cash_trend_v1` — daily/monthly ordered, delivered, returned, invoiced and net trends, selected by date basis.
3. `analytics_returns_exception_queue_v1` — uncredited returns, high-return products/customers, and invoice gaps.
4. `analytics_customer_order_to_cash_v1`, `analytics_sales_rep_order_to_cash_v1`, and `analytics_product_order_to_cash_v1` — drilldowns for 360 pages.

The first UI surface is an Order-to-Cash & Returns Control page. Existing dashboard pages receive compact cards only after KPI reconciliation passes.

## Sync and security

- A read-only Odoo 18 Edge Function will inspect and synchronize `stock.picking`, `stock.move`, `account.move`, and `account.move.line` for companies 1 and 2.
- It uses existing server-side Odoo credentials only; credentials never enter the browser.
- Source snapshot tables have RLS enabled, no public write policies, and are read by server-side/secure RPC only.
- Production sync is idempotent, logs its result in `sync_logs`, and never deletes data until a full successful snapshot and reconciliation are verified.

## Delivery sequence

1. Run the read-only Odoo field/count probe and confirm relations available in this database.
2. Create source snapshot tables and indexes, all with RLS enabled.
3. Implement a dry-run sync that returns counts and sampled relation coverage without writing data.
4. Validate invoice/credit-note totals with Finance and delivery/return quantities with Warehouse.
5. Enable idempotent sync and populate the new facts.
6. Add secure reconciliation RPCs and automated SQL tests.
7. Add the control page, then reusable cards to Executive and 360 pages.

## Acceptance criteria

- For a tested period, posted invoice and credit-note totals reconcile to Finance.
- Completed delivery and return quantities reconcile to Odoo warehouse operations.
- A partial delivery, partial return and partial invoice of one sales-order line reconcile independently.
- A return without a posted credit note appears as an open exception.
- Company, salesperson, customer, product and date filters preserve scope in every KPI and drilldown.
- No raw source table is exposed to anonymous clients; UI calls secure RPCs only.
