# OTC snapshot data quality — read-only Production baseline

**Checked:** 2026-11-26, with snapshots last synchronized at `2026-11-26 06:35:16 UTC`. Source: connected Supabase Production project `afzxhuaeggrngvchbvur`, **read-only SELECT only**. Not a direct live Odoo API reconciliation.

## Verified aggregate baseline

| Company | Snapshot type | Movement rows | Distinct move IDs | Duplicated ID groups | Invalid IDs | Non-direct/unverified sale order line links | Earliest event | Latest event |
|---|---|---:|---:|---:|---:|---:|---|---|
| MAS (1) | Deliveries | 1,850 | 1,850 | 0 | 0 | 0 | 2026-10-01 | 2026-11-25 |
| MAS (1) | Returns | 217 | 217 | 0 | 0 | 20 | 2026-10-01 | 2026-11-25 |
| Horeca Smart (2) | Deliveries | 32,481 | 32,481 | 0 | 0 | 7 | 2026-06-01 | 2026-11-25 |
| Horeca Smart (2) | Returns | 2,395 | 2,395 | 0 | 0 | 62 | 2026-06-01 | 2026-11-25 |

**Interpretation:** No duplicate or invalid movement IDs were found *within the current Supabase snapshot*. This does **not** prove all Odoo movements have been synchronized, and does not validate return quantities or UoM. The detection code in merged PR #17 still needs an authorized, read-only Odoo↔Supabase production-data check before its Edge Function can be deployed.

## Unverified original-delivery linkage

| Company | Returns with no `origin_returned_move_id` | Original move ID absent from delivery snapshot | Original delivery present | Missing original for returns dated before Oct 1 | Missing original for returns dated Oct 1 onward |
|---|---:|---:|---:|---:|---:|
| MAS | 0 | 50 | 167 | 0 | 50 |
| Horeca Smart | 0 | 192 | 2,203 | 141 | 51 |

These counts use a left join on original `stock.move` ID **within the same company**. The original move may predate the snapshot window or may be unavailable for other reasons; the count alone does NOT establish an incorrect return or wrongdoing. The split by date is the **return receipt date**, not the original movement date.

**Priority:** 50 MAS and 192 Horeca Smart returns warrant evidence retrieval from Odoo; prioritize 101 returns dated October 1 onward across both companies (50 + 51), while recognizing that an October return can still reference a delivery made before October. Also review 20 MAS + 62 Horeca Smart returns lacking a directly verified order-line link. The two groups can overlap and **must not be added** as distinct exceptions.

## Volume and measurement gates

- Maximum observed **single Cairo-local day** delivery-move rows: MAS 104; Horeca Smart 352. A daily move count is not a picking count; Odoo `stock.picking` and `stock.move` limits must be validated separately.
- A movement-ID comparison window must align Odoo picking `date_done` timezone/semantics with snapshot `delivery_date` and `return_receipt_date`; identical nominal calendar bounds do not prove identical event windows.
- Units for `delivered_qty` and `returned_qty` are not verified against Odoo `stock.move` quantity/UoM metadata. Any excess return flag stays **provisional**.
- Source data only extends to 2026-11-25 at the time checked; do not show Nov 26 missing-day data as zero activity.

## HIGH: Production company-scoped read permission remains unresolved

Read-only `pg_policies` inspection on 2026-11-26 confirmed that `public.otc_delivery_lines`, `public.otc_return_lines`, and `public.otc_invoice_lines` still have the permissive `customer360_authenticated_read` SELECT policy with `auth.uid() IS NOT NULL` for `authenticated`, without a company-specific RLS predicate. In staging, a restrictive company filter passed synthetic-role checks, but that billed staging branch was **deleted** on the user's instruction. **No restrictive policy is installed in Production.** Browser UI feature flags do not protect the Data API; server-level authorization is mandatory. This is a potential cross-company overread, not an observed breach. Production changes require a separately approved security release and real JWT/Customer 360 regression tests.

## Release gates / owners

| Gate | Owner (proposed) | Evidence to obtain | Status |
|---|---|---|---|
| Missing-original move sample from Odoo, no writes | Systems/Data + Odoo engineer | Relevant `stock.move` IDs, company, original picking date, visibility and state | OPEN |
| UoM metadata mapping | Warehouse + Systems/Data | Odoo delivered/returned UoM IDs, factors and quantity field semantics | OPEN |
| Date & timezone equivalence | Systems/Data | Odoo `date_done` vs snapshot event timestamp sampled around Cairo midnight | OPEN |
| Cross-company authenticated isolation | Systems/Data + Security reviewer | Real JWT tests for reps, managers, inactive account and Customer 360 | OPEN |
| Finance/warehouse operational sign-off | Finance + Warehouse | Review workflow + sample explanations, no premature fraud classification | OPEN |
| Production deploy sign-off | CEO / authorized release owner | Rollback, backup, test evidence, explicit authorization | OPEN |

**Changes performed in Production:** none. No new Supabase branch or paid environment was created.
