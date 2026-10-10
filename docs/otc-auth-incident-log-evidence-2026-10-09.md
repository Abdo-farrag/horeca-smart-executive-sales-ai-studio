# OTC AUTH_REQUIRED — historical gateway evidence (read-only)

Checked Supabase project `afzxhuaeggrngvchbvur` using **read-only** Edge invocation logs for October 4, 2026. No endpoint was invoked and no production writes were made.

| UTC timestamp | HTTP | User-Agent | JWT role shown | Deployment |
| --- | ---: | --- | --- | --- |
| 2026-10-04 11:16:45 | 200 | `pg_net/0.20.0` | `anon` | v1 |
| 2026-10-04 11:37:59 | 401 | `pg_net/0.20.0` | `anon` | v2 |
| 2026-10-04 20:18:24 | 401 | `node` | not present | v2 |
| 2026-10-04 20:20:19 | 401 | `node` | not present | v2 |

The logs show API-key metadata for the requests; this **does not establish** that the authorization bearer was valid or that the request had an approved manager/admin identity. The 200 at v1 does **not** establish successful financial sync or data writes; OTC production delivery/return/invoice snapshot counts were still zero at the last read-only check.

A read-only `cron.job` search by job name and command text found **no currently configured job** containing `sync-odoo18-order-to-cash`, `otc`, or `order%cash`. This does not rule out a prior/removed job, another SQL RPC using pg_net, or an external scheduler.

## Findings

1. The 11:37 UTC call was made by `pg_net` with `anon` JWT role. That role is not permitted by the v2 function's admin/manager/service-role caller guard, explaining the observed 401 at the application authorization layer.
2. The two evening 401 requests were sent by a `node` user-agent and had no JWT role visible in logged metadata. Missing metadata is **not proof** of a missing Authorization header; the precise origin remains unidentified.
3. The sequence from v1 200 to v2 401 is consistent with the v2 authorization requirement rejecting previously accepted callers. It is not proof of a regression in JWT parsing.

## Safe resolution gates

- Identify which historical SQL function or client sent the `pg_net` POST; do not weaken role checks to restore its previous access.
- Ensure production callers send a **legitimate user access token** for an active admin/manager, or a separately authorized service-to-service credential, through the `Authorization: Bearer ...` header. Never paste credentials into GitHub or a log.
- In Node callers, check whether code supplies only `apikey` and not bearer authorization, and whether session token refresh is in place.
- Keep the deployed function unchanged until staging or deployment approval. The deployed v2 still writes a failed `dry_run` into `sync_logs`; this has been fixed only on PR #11.
- Validate a narrow authenticated `dry_run` only after the fixed handler is deployed safely or tested in an isolated environment. No `sync` request yet.

**No merge, deploy, or production sync.**
