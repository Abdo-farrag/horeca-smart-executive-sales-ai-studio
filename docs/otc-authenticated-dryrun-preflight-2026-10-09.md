# OTC authenticated dry-run preflight — safe release gate

Checked the current PR handler and CI on 2026-10-09.

## Verified CI
- GitHub workflow CI #499: **success**.
- PostgreSQL OTC migrations #34: **success**.

## What the current handler does
1. Accepts POST; defaults to **dry_run**, unless body.mode is exactly "sync".
2. Resolves requested companies to 1 (MAS) and/or 2 (Horeca Smart).
3. Validates a Bearer authorization credential against a privileged role **before** accessing Odoo credentials.
4. Queries Odoo metadata and matching picking, return and invoice line records.
5. In dry_run mode, responds with data-coverage diagnostics and `writes_performed:0` **before** constructing any Supabase upsert.
6. In the current GitHub version, failed dry_run and unauthorized requests do **not** create database `sync_logs` rows. The **deployed production version still does**, so do not run a production dry-run against that older deployment.

## Safe request template (for an approved isolated deployment only)

Send HTTP POST with:
- `Authorization: Bearer <short-lived authorized access token>`
- `Content-Type: application/json`
- JSON: `{"mode":"dry_run","company_ids":[1],"start_date":"2026-10-01","end_date":"2026-10-02"}`

Use **a valid admin/manager user access token** or approved service-to-service identity. **Never** use an anon key as the bearer token; never store any secret in GitHub tests, logs or PR comments. Avoid embedding real customer data in diagnostics.

## Acceptance before live sync
- HTTP 200 and `success:true`, `mode:"dry_run"`, `writes_performed:0`.
- No additional rows in OTC snapshots and no new sync_logs row as a consequence of the dry run (check before/after in isolated DB).
- Review `missing_fields` and the direct delivery, return-origin and invoice linkage percentages.
- Escalate unexpectedly low linkage to Odoo schema mapping; don't infer missing links.
- Only after explicit finance/operations authorization perform a **separate** narrow write-enabled sync, followed by reconciliation against Odoo.

## Strict boundary
No live endpoint invoked or deployed to production as part of this preflight. Only existing GitHub CI and source code inspected. The historic 401 callers still need ownership and credential-path identification.
