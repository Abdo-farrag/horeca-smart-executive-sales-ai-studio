-- P1 Access Control: production-safe browser hardening for legacy analytics RPCs.
-- Release-candidate rule:
--   * unauthenticated (anon) callers must not execute commercial analytics RPCs;
--   * authenticated callers retain their existing EXECUTE grants until every
--     application-facing analytics RPC is replaced by a fully scoped secure entrypoint.
--
-- This deliberately avoids revoking authenticated here. Removing authenticated
-- EXECUTE before the scoped replacements exist would break the signed-in dashboard.

begin;

-- Revoke every overload in the analytics_* family from the unauthenticated role.
-- proname like 'analytics\_%' intentionally escapes '_' so only the analytics_ prefix matches.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'analytics\_%' escape '\'
  loop
    execute format('revoke execute on function %s from anon', r.function_signature);
  end loop;
end;
$$;

-- Do not grant analytics_* to anon anywhere in P1.
-- Authenticated access remains unchanged for this release candidate so the current
-- application can continue to call its reviewed RPC surface after login.
-- A later migration must move each screen to DB-scoped entrypoints and only then
-- revoke authenticated EXECUTE from the legacy analytics_* family.

commit;
