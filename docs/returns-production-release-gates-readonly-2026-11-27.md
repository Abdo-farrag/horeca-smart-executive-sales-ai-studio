# Returns Intelligence — Production release blockers (read-only check, 2026-11-27)

**Scope:** Supabase Production project `afzxhuaeggrngvchbvur` backing Odoo data for Horeca Smart and MAS. Only metadata `SELECT` queries were executed. No table contents changed. This document does **not** authorize deployment.

## Verified Production facts

1. **The returns center backend is absent**: `pg_proc` and `pg_tables` in `public` returned no matching deployed objects for:
   - `analytics_returns_cohort_dashboard_v1`
   - `analytics_returns_cohort_order_detail_v1`
   - `analytics_returns_cohort_order_cases_v1`
   - `review_returns_cohort_order_case_v1`
   - `analytics_returns_case_worklist_v1`
   - `assign_returns_order_case_v1`
   - `analytics_returns_case_assignees_v1`
   - `analytics_returns_order_assignments_v1`
   - `otc_return_audit_case_order_links`, `otc_return_case_assignments`, `otc_return_case_assignment_events`.
   The proposed SQL in `docs/security-proposals` has **not** been deployed. Enabling the UI flag currently would surface missing-function errors and risk confusion.
2. **Unscoped authenticated source table reads remain a security blocker.** Live `pg_policies` reports one permissive `customer360_authenticated_read` SELECT policy for each `otc_delivery_lines`, `otc_return_lines`, `otc_invoice_lines`: `(auth.uid() IS NOT NULL)`. These three tables have `RLS enabled=true`, `authenticated SELECT granted=true`, `anon SELECT granted=false`, `force RLS=false`. The policy does **not** constrain rows by company. This is **potential cross-company data exposure**; a real-JWT unauthorized read test has not been performed, so do **not** assert an actual breach.
3. Existing PR #20 is **Draft**, but has passing current CI and ephemeral PostgreSQL fixture tests. These prove unit/synthetic behavior, **not live role/company isolation or Odoo field semantics**.

## Proposed staged release plan (no production action until explicit approval)

**Gate A — Production security reconciliation:** Identify all existing consumer queries for Customer360 and OTC source tables. Draft a restrictive company SELECT filter compatible with existing permissive policy, based on **active** `app_user_roles` and `authorized_company_ids()`, and verify its semantics for managers with multi-company authorizations. Avoid a blind role-only global block that breaks legitimate Customer360 accounts. Test signed-in MAS and Horeca Smart JWTs, cross-company manual Data API queries, inactive/anon and service access. Validate RLS grants and SECURITY DEFINER functions, including anonymous JWT behavior.

**Gate B — Backend deployment evidence:** Implement approved migration (proposal files currently are *not* migrations); ensure deploy order of base review history, durable case links, cohort RPCs and assignment RPCs. Apply and validate ONLY in an approved non-Production environment, e.g. ephemeral GitHub PostgreSQL + authenticated Supabase test facility without unexpected billed staging, or a preexisting nonproduction project if available. Include explicit rollback SQL, table/privilege inventory and data backup. Do not implicitly create paid staging.

**Gate C — Real data correctness:** Compare Odoo18 source `stock.move` identifiers, original-returned links, quantity/UoM conversions, invoice/credit note signs, source `date_done` vs Cairo-local date and customer/order keys, including historical orders and November returns for October orders. Missing original deliveries in a short snapshot do not prove fraud. Verify no fanout or double counting.

**Gate D — Reviewer UAT:** With real (non-synthetic) JWTs test manager/admin, representative, inactive user, multi-company and no-company user; read-only dashboard; review event writes and optimistic assignment conflicts; scope restrictions in `SECURITY DEFINER`; preserved history after alert disappears; audit events append-only; correct due dates, owner names, and overdue flags.

**Gate E — Release approvals:** Finance and Warehouse sign-off on error classifications and documentation. CEO/release owner explicit approval to merge and deploy; keep `VITE_RETURNS_REVIEW_CENTER_ENABLED` OFF until the backend and access controls are verified. Feature flag is UI-only and not an authorization boundary.

## Decision/status log

| Item | Finding | Decision |
| --- | --- | --- |
| PR #20 code | CI and synthetic PostgreSQL green | DRAFT; no merge automatically |
| Proposed RPCs/tables | Absent in Production | BLOCK launch |
| Authenticated source SELECT | Broad company-unspecified policy | HIGH; block launch |
| Production write/migration | None performed | Preserve as is |
| Paid staging | Not created | Preserve user cost constraint |

**Next implementation option:** Prepare and validate the company isolation remedy as a self-contained safety PR, separately from frontend rollout. Security and Customer360 regression must precede any Production release. No alert is labeled as confirmed wrongdoing without source evidence.
