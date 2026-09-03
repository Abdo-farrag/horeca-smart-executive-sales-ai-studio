-- P1 Access Control: close inherited PUBLIC execution on legacy analytics RPCs.
-- Production QA after 040 showed that PostgreSQL PUBLIC privileges still made
-- most analytics_* functions executable by anon. This migration preserves the
-- signed-in application by granting authenticated explicitly, then revokes the
-- inherited PUBLIC/anon execution path.

begin;

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
    execute format('grant execute on function %s to authenticated', r.function_signature);
    execute format('revoke execute on function %s from anon', r.function_signature);
    execute format('revoke execute on function %s from public', r.function_signature);
  end loop;
end;
$$;

commit;
