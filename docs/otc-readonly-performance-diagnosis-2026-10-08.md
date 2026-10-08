# OTC read-only production diagnosis — 2026-10-08

This document records **read-only** checks against Supabase project `afzxhuaeggrngvchbvur`. No new migrations, sync or production writes were performed.

## Existing sales-person join is still expensive

`EXPLAIN (FORMAT JSON)` of a representative September order-line query joining `product_sales_from_june1` to `sales_orders_odoo18_secure` returned:

- Hash-join planner startup cost: approximately **26,840**.
- Expanded intermediate estimate: **1,048,190 rows** despite the date-filtered sales scan estimating **7,919 lines**.
- The secure view computes salesperson identity using a grouped scan of `customer_product_history` and other customer-name mappings; `customer_product_history` was estimated at approximately **121,152 rows** in that plan.
- The date-filtered scan used the existing `idx_psfj_state_date_company` index.
- These are **planner estimates, not measured execution times or proven duplication**.

A separate read-only count of September-independent order-level identity coverage found:

| Metric | Orders |
| --- | ---: |
| Distinct company/order pairs in `product_sales_from_june1` | 7,011 |
| Exactly one non-null `customer_product_history.salesperson_id` | 6,138 |
| Multiple distinct salesperson IDs | 0 |
| No resolvable salesperson ID from that source | 873 |

**Implication:** A cached `(company_id, order_id) → salesperson_id` dimension could eliminate the expensive secure-view join from line-level KPI and Trend queries, but must preserve the current authorization rules and resolve the 873 missing IDs from authoritative Odoo `sale.order.user_id` or validated fallback. This is a **separate candidate change**, not implemented or deployed here. Avoid filling missing IDs from an arbitrary customer's current rep; that would misattribute historical sales.

## Geography data

`customer_geography_odoo18` contains 708 rows; 26 have a null company ID. A read-only expansion into companies 1 and 2 yields **734 distinct company/customer keys** with zero duplicate keys. This validates the proposed customer geography dimension keying, but does not prove that assigning company-null customers to both companies is commercially correct.

## Release gates

1. Current PR CI is not a live PostgreSQL migration test.
2. Create a disposable Supabase staging branch only after explicit cost approval; it will **not** include production data.
3. Apply the ordered migrations and test security, no-fanout, multi-address delivery/return geography, and financial reconciliation on representative data.
4. Compare `EXPLAIN (ANALYZE, BUFFERS)` in staging with equivalent workload; avoid claiming speedup from planner cost alone.
5. Keep `Sync Now` disabled until authenticated Dry Run and Finance/Warehouse acceptance.

## Staging branch cost

Supabase returned **0.01344 per hour** for a development branch in organization `rtbgtxaimxgyafelrblt` (currency should be confirmed in Supabase billing before acceptance). No branch was created and no cost was incurred by this review.
