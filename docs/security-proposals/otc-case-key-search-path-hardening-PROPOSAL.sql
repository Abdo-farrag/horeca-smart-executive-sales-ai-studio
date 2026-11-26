-- PROPOSAL: stage-test only; requires separate Production release approval.
-- Immutable helper uses only pg_catalog builtins; pin its search_path.
begin;
alter function public.otc_return_audit_case_key(
 text,bigint,bigint,bigint,bigint[]
) set search_path = pg_catalog;
do $$
declare k text;
begin
 select public.otc_return_audit_case_key('EXCESS_RETURN_CANDIDATE',1,100,501,array[4001,4002]::bigint[]) into k;
 if k is null or length(k) <> 32 then raise exception 'Case-key regression'; end if;
end $$;
commit;
