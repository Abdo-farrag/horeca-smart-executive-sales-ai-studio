# Staging-only emergency bootstrap — 26 Nov 2026

**Non-production, exploratory.** Supabase Development Branch: `kwjgwdtcqejxgxwazrin`; main parent: `afzxhuaeggrngvchbvur`.

## Exact investigation

The new branch applied only migration `20260605045814`, then the legacy `20260701230629_upgrade_procurement_june1` failed because it assumes `public.raw_products` already exists. Parent contains that table with `product_id` bigint PRIMARY KEY and known product metadata columns. The first migration does not create it. This is a missing migration bootstrap dependency unrelated to the November OTC audit.

## Exact SQL executed on the *development branch only*

```sql
begin;
create table if not exists public.raw_products (
 product_id bigint primary key,
 product_name text,
 internal_reference text,
 category text,
 cost numeric default 0,
 sale_price numeric default 0,
 active boolean default true,
 product_type text,
 updated_at timestamptz default now(),
 product_tmpl_id bigint
);
alter table public.raw_products enable row level security;
comment on table public.raw_products is 'STAGING ONLY: empty source-schema bootstrap reconstructed from original project catalog to investigate failed historical migrations; no customer or product data copied.';
commit;
```

The `barcode` column is intentionally omitted so the next historical migration's conditional `ALTER TABLE` can add it, as originally intended. No product rows were copied. Production schema and migration history were not changed.

One `rebase_branch` was requested after this fix. Do not assume success merely because the request returned `success:true`: verify branch status reaches ready, migration list progresses beyond `20260605045814`, and all core OTC/roles objects exist.

This is an **investigative bootstrap**, not a validated, repeatable long-term migration. Full remediation must reconstruct the earliest missing schema object via a versioned, replay-safe bootstrap migration and cross-check every dependent legacy migration. If another missing dependency occurs, stop rather than creating an arbitrary series of tables.

Production deployment remains blocked pending staging, proper RLS test, source/units validation and explicit approval.
