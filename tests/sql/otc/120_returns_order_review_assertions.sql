-- Ephemeral PostgreSQL only: verify per-order case persistence and isolation.
-- Run AFTER 110_returns_cohort_assertions.sql and new proposal SQL.
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$
declare k text;v int;n int;
begin
 select c.case_key,c.review_version into k,v
 from public.analytics_returns_cohort_order_cases_v1(1,1001) c
 where c.rule_code='POSSIBLE_DUPLICATE_RETURN' and c.currently_detected
 limit 1;
 if k is null then raise exception 'Expected synthetic duplicate return candidate on order 1001';end if;
 perform * from public.review_returns_cohort_order_case_v1(
  1,1001,k,v,'investigating','Synthetic reviewer checks two same-size returns');
 if not exists(select 1 from public.otc_return_audit_case_order_links m
    where m.case_key=k and m.company_id=1 and m.order_id=1001) then
  raise exception 'Case-to-original-order mapping not persisted';end if;
 select count(*) into n from public.analytics_returns_cohort_order_cases_v1(1,1001) c
  where c.case_key=k and c.review_status='investigating' and c.review_version=v+1
    and c.currently_detected;
 if n<>1 then raise exception 'Versioned review status not visible in original order';end if;
 -- A historical case cannot be silently reassigned to a second order.
 begin
  perform * from public.review_returns_cohort_order_case_v1(
   1,1002,k,v+1,'resolved','Attempt to reassign another order');
  raise exception 'WRONG_ORDER_SHOULD_HAVE_FAILED';
 exception when insufficient_privilege then null;end;
 -- Disappearance does NOT auto-resolve, and history stays associated with order.
 perform set_config('app_test.case_key',k,true);
end $$;
reset role;
delete from public.otc_return_lines where odoo_return_move_id=4003;
set role authenticated;
do $$
declare k text;v int;n int;ev bigint;
begin
 k:=current_setting('app_test.case_key',true);
 select count(*),max(c.review_version) into n,v
 from public.analytics_returns_cohort_order_cases_v1(1,1001) c
 where c.case_key=k and c.review_status='investigating'
   and c.currently_detected=false;
 if n<>1 or v<>1 then raise exception 'Vanished candidate no longer linked to order or auto-resolved';end if;
 select count(*) into ev from public.analytics_return_audit_history_events_v1(k);
 if ev<>1 then raise exception 'Missing immutable review event';end if;
end $$;
-- Manager company 2 cannot see company 1 linked history.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
declare denied bool:=false;seen bigint;
begin
 begin perform * from public.analytics_returns_cohort_order_cases_v1(1,1001);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-company review queue allowed';end if;
 select count(*) into seen from public.analytics_returns_cohort_order_cases_v1(2,1001);
 if seen<>0 then raise exception 'Company 2 review queue includes MAS review';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$
declare denied bool:=false;
begin
 begin perform * from public.analytics_returns_cohort_order_cases_v1(1,1001);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Sales rep viewed review details';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','anon',false);
set role anon;
do $$
declare denied bool:=false;
begin
 begin perform * from public.analytics_returns_cohort_order_cases_v1(1,1001);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous user viewed review details';end if;
end $$;
reset role;
