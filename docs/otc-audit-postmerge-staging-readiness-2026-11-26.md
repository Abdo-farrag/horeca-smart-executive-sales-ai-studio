# OTC audit — post-merge staging readiness (2026-11-26)

## Observed state (read-only verification)
- PR #14 merged into main as bc6858468b575869731ad5dc564c14bfa93560d0.
- Supabase project afzxhuaeggrngvchbvur (named odoo) contains the existing sync-odoo18-order-to-cash Edge Function and OTC source snapshots.
- The new review/UoM tables, audit RPCs, and coverage view were absent from the actual database at the time of inspection.
- The new probe-odoo18-uom-readonly and probe-odoo18-movement-reconciliation Edge Functions were absent from deployed function inventory.
- A successful GitHub merge is NOT a database migration or Edge Function deployment.

## Baseline snapshots (not verified Odoo source completeness)
| Company | All stored deliveries | All stored returns | Nov 1+ deliveries | Nov 1+ returns | Nov 1+ returns without direct order-line link | Nov 1+ return originals missing from snapshot |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| MAS (company 1) | 1,850 | 217 | 825 | 85 | 4 | 12 |
| Horeca Smart (company 2) | 32,481 | 2,395 | 5,032 | 304 | 12 | 21 |

- Last snapshot synced about 2026-11-26 00:35 UTC; this does not prove all source moves were available.
- Return originals absent from a snapshot could be earlier than its source window; this is NOT proof of an inventory error.
- Read-only numeric return>delivery grouping over all stored direct-link line/product data: MAS 6 groups; Horeca Smart 91 groups. All are strictly PROVISIONAL pending verified quantity/UoM conversions and original movement coverage.

## Staging-first deployment runbook (separate explicit approval required)
1. Freeze inventory of existing database objects, security policies, function signatures and backups. Prepare an isolated staging database with production-shaped schema/data.
2. Run docs/otc-audit-live-preflight-readonly.sql on the intended project; record counts, objects, and company mapping. Do not treat GitHub CI fixture as a production security test.
3. Apply and test merged SQL migrations in this exact order on staging only:
   - supabase/migrations/20261124010000_otc_return_audit_candidates.sql
   - supabase/migrations/20261124011000_otc_return_audit_secure_rpc.sql
   - supabase/migrations/20261124012000_otc_return_audit_review_workflow.sql
   - supabase/migrations/20261124013000_otc_return_audit_history.sql
   - supabase/migrations/20261124014000_otc_uom_evidence_gate.sql
   - supabase/migrations/20261125010000_otc_return_evidence_coverage.sql
4. Verify real JWT authentication, active manager/admin access, company isolation, anonymous/sales rep denial, review version conflicts and immutable review-event history. Confirm source tables remain non-browser-readable.
5. Deploy the read-only probes to staging manually with verify_jwt=true, no cron and no Odoo writes. Confirm Odoo source scope and secret isolation.
6. Run each probe manually for one company and up to seven days. Validate Odoo executed quantity semantics, movement UoM, product base UoM, conversion category/factor, original move IDs, timestamps and picking eligibility.
7. Reconcile complete bounded Odoo move IDs against OTC snapshot, separate outgoing deliveries from customer returns and compare with Warehouse and posted Finance credit notes. Sampled ID equality does not certify financial or quantity correctness.
8. Review and approve a separate evidence-ingestion workflow only after native UoM conversion is independently validated. Do not auto-correct Odoo or promote provisional findings.
9. Warehouse and Finance sign off sample warnings and incomplete original move evidence. Do not auto-close alerts when source snapshot changes.
10. Production migration or function deployment requires a fresh, explicit go-live approval, rollback plan, owner and monitoring.

## Release blockers
- Successful main-commit CI and PostgreSQL tests.
- Source-shaped staging schema, grants and RLS verified.
- Original delivery and return movement coverage confirmed on real Odoo, including historical parent moves.
- Approved verified UoM formula and reproducible source-provenance evidence.
- Sign-off from Warehouse, Finance, and deployment owner.

This documentation-only PR does not apply SQL, deploy Edge Functions, activate probes, sync Odoo, or change production.
## CRITICAL SECURITY PRE-FLIGHT FINDING — direct authenticated SELECT
On 2026-11-26 read-only catalog inspection of the connected Odoo Supabase project found:
- public.otc_delivery_lines, public.otc_return_lines and public.otc_invoice_lines have RLS enabled **and** authenticated role table-level SELECT permission.
- Each has an existing permissive SELECT policy named customer360_authenticated_read, with USING (auth.uid() IS NOT NULL), not scoped to company_id or staff role.
- Therefore RLS, by itself, does not presently impose company isolation on these tables for signed-in users with Data API access. No evidence of actual unauthorized use was collected.
- The existing authorized_company_ids() is a SECURITY DEFINER scoped function: active sales_rep/supervisor -> one company, manager/admin -> both, unauthenticated/missing profile -> exception.
- Role inventory at inspection contained two active admin users. Do not infer this remains true after onboarding staff.
- There was no separately verified isolated Supabase staging environment. The only development-branch result for the Odoo project was a default 'main' entry, not evidence of a safe disposable staging clone.

**DO NOT deploy audit RPCs to Production before this direct-read surface is reviewed.**

Proposed minimal defense in depth (not applied) is in
docs/security-proposals/otc-authenticated-company-restrictive-policy-PROPOSAL.sql.
It adds a restrictive company policy on each OTC table rather than immediately removing Customer360's permissive policy. Its behavior is exercised in synthetic SQL tests in tests/sql/otc/90_restrictive_company_policy_proposal_assertions.sql.

Production change remains blocked until real signed-in JWT tests confirm:
1. same-company salesperson sees only authorized rows;
2. cross-company salesperson cannot see the other company's rows;
3. inactive/missing-role users cannot read;
4. managers/admins retain their approved two-company scope;
5. Customer 360 and the existing authorized server RPCs still work.

Do not automatically apply the SQL proposal based only on synthetic tests. A missing isolated staging environment is a stop condition, not authorization to test by changing Production.
## 2026-11-26 — Actual Supabase Development Branch failure
- User approved creation at quoted USD 0.01344/hour; branch ID f84f071e-5378-4327-93dc-77f6a0e9755c, project ref kwjgwdtcqejxgxwazrin, no Production data copy.
- After branch creation and one rebase attempt, branch reported MIGRATIONS_FAILED, despite SQL connectivity.
- The branch migrated only 20260605045814 (create_kartona_orders_database), populated kartona schema but left public without application tables; OTC and staff scope tables were absent.
- Branch PostgreSQL error log around 2026-11-26 02:00–02:02 UTC: relation public.raw_products does not exist.
- The next parent migration 20260701230629 (upgrade_procurement_june1) begins with a conditional barcode check followed by ALTER TABLE public.raw_products ADD COLUMN barcode, assuming raw_products already existed. Parent production does have raw_products; new branch does not.
- Root cause: historical migration/bootstrap dependency on manually pre-existing public.raw_products that is not reconstructed by the recorded earlier migration. This is schema drift / non-replayable migration history, not a failure of the new OTC audit migration.
- NO repair table was invented, no migrations were manually pushed, and no Production objects changed. Do not rerun rebase blindly or claim staging is ready.
- Remediation gate: inventory earliest missing bootstrap objects and their dependencies from the original schema, reconstruct migration history in a verified disposable environment with schema-only source provenance, then rerun branch migration sequence; alternatively restore a reviewed staging schema snapshot. Check other historic migrations for similar dependencies.
- Until complete, continue only with isolated PostgreSQL CI fixtures and read-only source audits. Hourly billing continues while this branch exists; delete after explicit decision if repair is blocked.