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