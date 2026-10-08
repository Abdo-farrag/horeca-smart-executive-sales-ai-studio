# Deployed OTC Edge Function — authorization and dry-run investigation

## Grounded production findings (read-only, 2026-10-08)

Supabase project `afzxhuaeggrngvchbvur` has an ACTIVE `sync-odoo18-order-to-cash` Edge Function at **version 2**, with **verify_jwt=true**. Its deployed `index.ts` is **not** the head of GitHub PR #11.

The deployed code:
- Reads the `Authorization` bearer token in `assertPrivilegedCaller`; a missing or invalid user token results in `AUTH_REQUIRED`, and inactive or unauthorized roles return `SYNC_FORBIDDEN`.
- Explicitly permits a request using the service-role key, and otherwise looks up an active `admin`/`manager` profile.
- **Still executes `sync_logs.insert` in the catch/error path even for dry runs and auth failures**. That behavior has been corrected in PR #11, but not deployed.

Read-only `sync_logs` inspection found **three `order_to_cash_returns` errors**, dated October 4, all with `AUTH_REQUIRED`, each with zero synced rows. Last read-only OTC snapshot count was **0 delivery / 0 return / 0 invoice** rows. The caller of these failed attempts **cannot be uniquely identified from these logs alone**.

## Security interpretation

Because `verify_jwt=true`, the gateway can reject requests before they reach the handler. Conversely, an `AUTH_REQUIRED` row inserted by the deployed function indicates execution reached its catch block; it does not disclose whether the client omitted a bearer token, supplied an invalid token, or a valid user token could not be resolved.

**Never log access tokens, service-role keys, complete Authorization headers, or customer-identifying request bodies.**

## Correct next checks — no production writes

1. Inspect request metadata in Supabase Edge invocation logs for the October 4 error windows: HTTP status, request path, user-agent and non-sensitive function invocation metadata. Logs may have aged out; absence is inconclusive.
2. Identify all code paths and jobs that invoke `sync-odoo18-order-to-cash`; the `apps/lovable/src/analytics/orderToCash.ts` adapter only calls reporting RPCs and is **not** an identified sync caller.
3. Prepare a minimal authenticated **dry_run** request with an authorized actor and narrow date range; do **not** send it to the currently deployed version, because its error path can write to `sync_logs`.
4. Require explicit deployment approval or a fully isolated environment to test the corrected handler. Do not bypass `verify_jwt` or relax role checks to hide an auth error.
5. After verified dry run and schema compatibility, plan a limited write-enabled sync separately with Finance/Warehouse authorization.

## Release status

**DO NOT MERGE / DO NOT DEPLOY / DO NOT PRESS SYNC NOW.** The GitHub test success does not prove production auth integration.
