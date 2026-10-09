# OTC invocation source audit — 2026-10-09

Read-only follow-up against Supabase project `afzxhuaeggrngvchbvur`.

## Findings
- A search of **currently defined public SQL function bodies** did not find any function containing the explicit endpoint string `sync-odoo18-order-to-cash`.
- A prior read-only search of `cron.job` names/commands also found no direct named OTC sync job.
- Supabase includes the `pg_net` extension's `net._http_response` and `net.http_request_queue` tables. Their existence does **not** identify the sender, historical requests or guarantee retained rows.
- Historical October 4 Edge invocation logs explicitly show a `pg_net/0.20.0` request, plus separate `node` requests, so there is evidence of both types of HTTP client but **not the precise SQL caller or Node program**.
- Existing PR code validates privileged caller authorization, and its dry-run failure paths have been fixed to avoid error-log writes; changes are **not deployed**.

## Next safe trace
1. Search all application/server/automation repositories and previous SQL migration scripts for `sync-odoo18-order-to-cash`, `net.http_post` and the endpoint path. The current `apps/lovable/src/analytics/orderToCash.ts` handles report RPC calls only.
2. Review known scheduled jobs and SQL RPC invokers without reading or disclosing service-role secrets. Avoid dumping `net.http_request_queue.headers` or request bodies.
3. Introduce audit metadata **only after approved deployment**, using request IDs, mode and approved caller roles (never raw Authorization headers, API keys or identifiable data).
4. No real dry run can be certified yet because the live Edge version still has an error-path write to `sync_logs`.
5. Do not disable JWT verification, loosen authorization checks, sync data, merge or deploy in pursuit of eliminating 401s.

## Remaining blockers
The exact origin of historical Node and pg_net requests is not yet proven. A production-grade authenticated dry run and Finance/Warehouse reconciliation must precede write-enabled synchronization.
