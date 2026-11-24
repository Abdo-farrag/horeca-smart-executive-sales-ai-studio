-- Execute after provisional anomaly tests and secure RPC migration.
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','',false);
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_candidates_v1(); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'missing JWT must fail closed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_candidates_v1(2); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'forbidden company scope allowed'; end if;
 if exists(select 1 from public.analytics_return_audit_candidates_v1() where company_id<>1) then
   raise exception 'cross-company data leak'; end if;
 if not exists(select 1 from public.analytics_return_audit_candidates_v1()
               where rule_code='EXCESS_RETURN_CANDIDATE') then
   raise exception 'manager cannot read valid candidate'; end if;
end $$;
update public.app_user_roles set role='sales_rep';
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_candidates_v1(); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'sales rep can access manager queue'; end if;
end $$;
update public.app_user_roles set role='manager';
do $$
begin
 if has_function_privilege('anon','public.analytics_return_audit_candidates_v1(bigint,text,integer,integer)','EXECUTE') then
   raise exception 'anon can execute audit RPC'; end if;
end $$;
