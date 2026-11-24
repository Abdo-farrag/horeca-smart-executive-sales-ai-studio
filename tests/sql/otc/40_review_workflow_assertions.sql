-- Issue #13 synthetic review lifecycle + access + concurrency.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
declare k text; v record; blocked boolean;
begin
 select q.case_key into k from public.analytics_return_audit_review_queue_v1()
 q where q.rule_code='EXCESS_RETURN_CANDIDATE' limit 1;
 if k is null then raise exception 'review queue missing test case'; end if;
 if not exists(select 1 from public.analytics_return_audit_review_queue_v1()
    where case_key=k and review_status='new' and review_version=0) then
   raise exception 'new audit state missing'; end if;
 select * into v from public.review_return_audit_candidate_v1(k,0,'investigating','Checking original delivery');
 if v.version<>1 or v.status<>'investigating' then raise exception 'first review transition failed';end if;
 select * into v from public.review_return_audit_candidate_v1(k,1,'confirmed_error','Verified with warehouse documentation');
 if v.version<>2 then raise exception 'second review transition failed'; end if;
 if (select count(*) from public.otc_return_audit_review_events where case_key=k)<>2 then
   raise exception 'review history missing'; end if;
 blocked:=false;
 begin perform * from public.review_return_audit_candidate_v1(k,1,'resolved','Stale update attempt');
 exception when others then
   if sqlerrm='REVIEW_VERSION_CONFLICT' then blocked:=true; else raise; end if;
 end;
 if not blocked then raise exception 'optimistic concurrency failed'; end if;
 blocked:=false;
 begin perform * from public.review_return_audit_candidate_v1(k,2,'resolved','a');
 exception when others then
   if sqlerrm='REVIEW_NOTE_REQUIRED' then blocked:=true; else raise; end if;
 end;
 if not blocked then raise exception 'note length requirement missing'; end if;
 blocked:=false;
 begin perform * from public.review_return_audit_candidate_v1('00000000000000000000000000000000',0,'resolved','No source exists');
 exception when others then
   if sqlerrm='CASE_NOT_IN_CURRENT_SNAPSHOT' then blocked:=true; else raise; end if;
 end;
 if not blocked then raise exception 'made-up case allowed'; end if;
 if (select count(*) from public.otc_return_audit_review_events where case_key=k)<>2 then
   raise exception 'failed review modified immutable history'; end if;
end $$;
-- Test cross-company scope using a valid case key from another company.
do $$
declare k text; blocked boolean:=false;
begin
 select q.case_key into k from public.otc_return_audit_candidates_v1 q
 cross join lateral (select public.otc_return_audit_case_key(q.rule_code,q.company_id,q.sale_order_line_id,q.product_id,q.return_move_ids) as case_key) x
 where q.company_id=2 limit 1;
 begin perform * from public.review_return_audit_candidate_v1(k,0,'investigating','Forbidden company');
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'cross-company review allowed'; end if;
end $$;
update public.app_user_roles set role='sales_rep';
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_review_queue_v1();
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'sales rep read allowed';end if;
 blocked:=false;
 begin perform * from public.review_return_audit_candidate_v1('00000000000000000000000000000000',0,'resolved','Should be denied');
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'sales rep review allowed';end if;
end $$;
update public.app_user_roles set role='manager';
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','',false);
do $$
declare blocked boolean:=false;
begin
 begin perform * from public.analytics_return_audit_review_queue_v1();
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'anon read allowed';end if;
 if has_table_privilege('authenticated','public.otc_return_audit_reviews','SELECT') or
    has_table_privilege('authenticated','public.otc_return_audit_review_events','INSERT') then
   raise exception 'raw audit tables exposed';end if;
 if has_function_privilege('anon','public.review_return_audit_candidate_v1(text,integer,text,text)','EXECUTE') then
   raise exception 'anon write execute permission present';end if;
end $$;
