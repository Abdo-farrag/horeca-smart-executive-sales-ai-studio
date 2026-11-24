# OTC Return Audit — Unit of Measure and Release Gate

Issue #13 / Draft PR #14. This is a **design and verification checklist**, not an assertion about current Odoo data, and not a Production release.

## Verified code observation (24 Nov 2026)
Current `sync-odoo18-order-to-cash/index.ts` reads `stock.move.quantity` with fallback to `product_uom_qty`, then writes those values into `otc_delivery_lines.delivered_qty` and `otc_return_lines.returned_qty`. Neither OTC snapshot currently retains `stock.move.product_uom`, the source quantity field that was chosen, or a canonical conversion factor. An ordinary numeric comparison between delivery and return quantities is therefore **provisional**.

## Before elevating any excess-return alert to a confirmed arithmetic finding

1. For each source `stock.move`, fetch its actual executed quantity and *its* unit ID, along with `product_id`, `origin_returned_move_id`, `picking_id`, `sale_line_id`, `company_id`, `state`, `write_date`, and Odoo record ID. Use read-only queries and inspect field metadata for the installed Odoo 18 configuration.
2. Verify whether the chosen Odoo completed quantity is expressed in the move UoM or product base UoM in this deployment. Never substitute demand quantity for executed quantity just because the executed field is absent.
3. Read the relevant UoM category, ratio/factor and rounding; convert delivery/return to **the same product base UoM**. Reject cross-category conversions. Preserve source qty, source UoM ID, normalized qty, target UoM ID, conversion factor and conversion provenance.
4. Link returns to the immutable `origin_returned_move_id`; a sale-order-line and product match alone is insufficient for a certain double-return allegation. Keep missing original moves as unresolved evidence.
5. Consider multiple partial returns, canceled/reversed movements, reprocessing of the same Odoo movement, rounding tolerances and timezone. De-duplicate by (company ID, source model, native Odoo move ID).
6. Reconcile at least one recent agreed period against Odoo Stock Moves (done), Finance Credit Notes and original Delivery Orders, signed off by Warehouse and Finance. Store the checks, source timestamps and exceptional cases.

## Alert review workflow
- P0 candidates are **not** assertions of fraud, confirmed mistakes, or completed accounting settlements.
- Manager/admin scoped review: new -> investigating/explained/confirmed_error/resolved/dismissed, requiring a note. All transitions append an audit event. Optimistic version check prevents overwrites.
- For grouped excess/missing-delivery alerts, case IDs remain stable when additional movements are received; per-pair duplicate alerts remain movement-specific.
- The current queue lists *currently detected candidates*. When source data is corrected and an alert no longer matches, historical reviews remain in the review tables but an archived/history UI is a separate requirement. Do not interpret disappearance as automatic resolution.
- No automatic return cancellation, credit note, inventory adjustment, stock correction or Odoo writes.

## Go-live blockers
- Test native Odoo UoM semantics and synchronization completeness.
- Full staging migration verification against the *actual* Production-shaped schema and role catalog.
- Reconciliation and user acceptance by Warehouse + Finance.
- Secure RPC review/deny checks and final CI run on exact PR head.
- Explicit approval to migrate/release; no automatic merge or Production deployment.
