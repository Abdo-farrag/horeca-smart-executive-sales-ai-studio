-- Synthetic permanent review history evidence: disappearance is NOT resolution.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
declare k text; r record;
begin
 select case_key into k from public.otc_return_audit_reviews limit 1;
 if k is null then raise exception 'synthetic review missing';end if;
 select * into r from public.analytics_return_audit_history_v1() where case_key=k;
 if not found or r.review_version<>2 or r.transition_count<>2 or not r.currently_detected then
   raise exception 'review history not consistent with queue';end if;
 if (select count(*) from public.analytics_return_audit_history_events_v1(k))<>2 then
   raise exception 'event timeline missing';end if;
 delete from public.otc_return_lines where odoo_return_move_id in (4010,4011,4012);
 select * into r from public.analytics_return_audit_history_v1() where case_key=k;
 if not found or r.currently_detected or r.review_status<>'confirmed_error' then
   raise exception 'historical alert was incorrectly erased or auto-resolved';end if;
 if exists(select 1 from public.analytics_return_audit_review_queue_v1() where case_key=k) then
   raise exception 'cleared source still appears in current queue';end if;
end $$;

-- A reviewed case for another company must be hidden, even if its source is gone.
insert into public.otc_return_audit_reviews
 (case_key,company_id,rule_code,status,version,reviewer_note,reviewed_by,reviewed_at)
values ('22222222222222222222222222222222',2,'UNLINKED_RETURN','investigating',1,'Synthetic company-two note',
'00000000-0000-0000-0000-000000000001',now());
do $$
declare blocked boolean:=false;
begin
 if exists(select 1 from public.analytics_return_audit_history_v1() where company_id=2) then
   raise exception 'cross-company history leaked';end if;
 begin perform * from public.analytics_return_audit_history_events_v1('22222222222222222222222222222222');
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'cross-company timeline accessible';end if;
 blocked:=false;
 begin perform * from public.analytics_return_audit_history_v1(2);
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'unauthorized history company filter accepted';end if;
end $$;
update public.app_user_roles set role='sales_rep';
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_history_v1();
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'salesperson can read manager history';end if;
end $$;
update public.app_user_roles set role='manager';
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','',false);
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_history_v1();
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'unauthenticated history read permitted';end if;
 if has_function_privilege('anon','public.analytics_return_audit_history_v1(bigint,text,integer,integer)','EXECUTE')
 or has_function_privilege('anon','public.analytics_return_audit_history_events_v1(text)','EXECUTE') then
   raise exception 'anon history execution granted';end if;
end $$;
