# OTC ephemeral PostgreSQL migration gate

This CI workflow runs **PostgreSQL 17 in a temporary GitHub Actions service container**. It is deliberately disconnected from Supabase production and requires no Supabase credentials or production data.

## Files

- `.github/workflows/otc-postgres.yml`: starts the isolated PostgreSQL service, applies the synthetic baseline and the **11** migrations matching `supabase/migrations/2026100707*.sql` in lexicographic order.
- `tests/sql/otc/00_fixture.sql`: minimal synthetic Odoo/Supabase dependency tables, auth stubs and representative multi-company order/delivery/return/invoice rows.
- `tests/sql/otc/10_assertions.sql`: verifies migration execution, RLS/grants, denial of missing JWT role, delivery area resolution, separate return pickup, multi-company isolation, no line/order fanout, and financial totals from KPI/Trend RPCs.

### Example synthetic expectations

- MAS ordered value **170**, net delivered **130**, net invoiced **130**.
- All companies ordered value **200**, four order-trend dates.
- Order 1001 and 1002 have the **same commercial customer** but different shipping areas (Nasr City / Maadi).
- Company 2 reuses delivery partner ID 201 without inheriting Company 1 geography.
- A return from order 1001 is allocated to the original outbound delivery area, while return pickup partner remains distinct.

## How to run

Every PR/push modifying OTC SQL or these test files automatically triggers `OTC PostgreSQL Migration Tests`. GitHub's Actions tab also offers manual `workflow_dispatch` when the workflow is available on the default branch.

## Boundaries

This is a **targeted synthetic migration test**, not a full Supabase/Odoo staging deployment:
- It uses a minimal baseline schema, not every historical production migration or extension.
- `auth.uid()`, `auth.role()` and `otc_scope_row_allowed` are fixture stubs; real Supabase JWT/RLS authorization must be tested separately.
- Tests use synthetic order and financial data; they cannot prove real Odoo linking accuracy, real production reconciliation, or production-scale query latency.
- The PostgreSQL service is ephemeral and deleted after each job. No production write or synchronization occurs.
- GitHub-hosted Actions minutes are subject to the repository/account's usage allowance; this does not provision a paid Supabase branch.

**Release status:** Draft PR. Keep deployment and Sync Now blocked pending production-schema compatibility, staging-like security validation, live authenticated Dry Run and financial sign-off.
