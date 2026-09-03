-- P1 Access Control: final direct-execute hardening for legacy analytics RPCs.
-- IMPORTANT ORDERING GATE:
-- Do NOT apply this migration until all secure application entrypoints and role QA are ready.
-- Once applied, browser users must not be able to invoke legacy analytics_* functions directly.

begin;

-- Revoke every overload in the legacy analytics_* family from browser roles.
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
    execute format('revoke execute on function %s from authenticated', r.function_signature);
  end loop;
end;
$$;

-- SECURE_APP_ENTRYPOINTS_AFTER_LEGACY_REVOKE
-- Secure P1 entrypoints are granted explicitly in their defining migrations only.
-- Authorization helpers remain authenticated-only and are not named analytics_*:
--   current_access_profile()
--   authorized_company_ids()
--   authorized_salesperson_ids()
--   can_view_executive()
--   can_manage_users()
-- Application-facing scoped analytics RPC grants will be listed explicitly below
-- once their definitions are complete and reviewed. Never add a blanket grant on
-- the legacy analytics_* family.

commit;
