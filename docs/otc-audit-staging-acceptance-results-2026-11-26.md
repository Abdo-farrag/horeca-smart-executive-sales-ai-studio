# OTC returns audit — actual staging acceptance report

**Date:** 2026-11-26
**Source production project:** `afzxhuaeggrngvchbvur` (`odoo`)
**Isolated Supabase development project:** `kwjgwdtcqejxgxwazrin` (`otc-audit-staging-20261126`)
**Billing:** Development Branch $0.01344/hour while it exists. No production data cloned.

## Verified deployment results

| Check | Result |
| --- | --- |
| Historical parent migration count | 160 / 160 replayed |
| Audit candidate view migration | Applied on staging |
| Manager-secure candidate RPC migration | Applied on staging |
| Versioned review/event log migration | Applied on staging |
| Persistent history RPC migration | Applied on staging |
| Verified UoM evidence gate migration | Applied on staging |
| Return evidence coverage RPC migration | Applied on staging |
| Proposed restrictive company-scoped RLS on 3 OTC source tables | Applied on staging ONLY |
| Total staging migration history entries | 167 |
| `probe-odoo18-uom-readonly` | ACTIVE, version 1, verify_jwt=true |
| `probe-odoo18-movement-reconciliation` | ACTIVE, version 1, verify_jwt=true |
| Source delivery, return, review, staff rows left over from synthetic tests | 0 |
| Active pg_cron jobs | 0 |
| Raw UoM evidence directly SELECTable by authenticated | No |
| Review records directly SELECTable by anon | No |
| Candidate queue RPC directly EXECUTEable by anon | No |
| Candidate queue RPC EXECUTEable by authenticated | Yes, with internal active-manager and company checks |

## Transactional staging UAT actually executed

1. `tests/sql/otc/95_staging_rbac_transactional_rollback.sql`: Synthetic real schema rows and database-role request-claim simulation. Two scoped sales reps each saw only their company; manager saw both; inactive user and anonymous caller were denied.
2. `tests/sql/otc/96_staging_audit_workflow_rollback.sql`: A synthetic 12-vs-10 return generated a **provisional** excess candidate. Source UoM evidence was marked missing. Manager changed status to investigating with a persisted versioned event. After modifying the synthetic returned quantity to 1, the candidate disappeared but the review history remained. All test changes rolled back.
3. Independently checked staging source/user/review tables remain empty after the tests.
4. Verified restrictive RLS policies coexist with original Customer 360 permissive policy on delivery, return and invoice source tables. This is a company-scope proof at SQL role/GUC level, **not** a real externally issued JWT test.

## Historic bootstrap deviations

The original Supabase DB was not reproducible from recorded migrations without a schema-only historic bootstrap. The staging replay used exact catalog-derived empty prerequisite tables and views, installed pg_cron to match original extension dependencies, and temporarily recreated the historic broad table ACL needed for `product_sales_write_hardening_20261024` to validate that hardening migration. Checked staging after replay: anonymous INSERT and authenticated UPDATE were revoked; only authenticated SELECT remained. Unscheduled both historic jobs created by replay.

## Critical release gates still NOT met

- NO real Odoo18 stock.move UoM metadata read performed; `quantity` semantics and conversion factor remain unverified.
- NO real Odoo-versus-Supabase stock.move ID comparison performed; staging has no production snapshot rows. Production snapshot coverage remains a separate read-only observation.
- NO real signed-in JWT/Customer 360 regression from web frontend performed. SQL simulation alone does not prove end-to-end Auth behavior.
- No verified UoM evidence ingestion. Do not label raw quantity discrepancies confirmed.
- Warehouse and Finance UAT, rollback review and explicit Production authorization remain open.
- Two read-only probes exist **only on staging**. No production audit migration, RLS hardening or Edge Function was deployed.

**Go-live status: BLOCKED.** The purpose of this report is to preserve inspectable evidence, not to request or perform a production merge. Staging remains billable until deleted.