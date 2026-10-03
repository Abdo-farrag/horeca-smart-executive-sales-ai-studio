# Order-to-Cash Probe Evidence — 2026-10-03

Read-only production probe: `probe-odoo18-returns-fields`

Result:
- database: `DB-LIVE`
- `account.move`: all expected invoice/refund fields available
- `account.move.line.sale_line_ids`: available
- `stock.picking.return_id`: available
- `stock.move.origin_returned_move_id`: available
- posted customer credit notes (companies 1 and 2): 119
- non-posted customer credit notes (companies 1 and 2): 29

Open relation gate before sync:
- confirm `stock.move.sale_line_id` availability and direct-link coverage
- measure `account.move.line.sale_line_ids` cardinality (0 / 1 / >1)
- measure return linkage through `origin_returned_move_id`

No production data was modified by this probe.
