-- Run on isolated PostgreSQL 17 only, after 120_returns_order_review_assertions.sql
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$
declare k text;v integer;n integer;denied boolean;
begin
 select c.case_key into k from public.analytics_returns_cohort_order_cases_v1(1,1001) c
 where c.review_status='investigating' and not c.currently_detected limit 1;
 if k is null then raise exception 'Synthetic historical reviewed case missing';end if;
 perform * from public.assign_returns_order_case_v1(
   1,1001,k,'00000000-0000-0000-0000-000000000005','high',
   (now() at time zone 'Africa/Cairo')::date,0,'Assign to warehouse lead for evidence');
 select count(*),max(w.assignment_version) into n,v
 from public.analytics_returns_case_worklist_v1(1,true,100,0) w
 where w.case_key=k and w.assignee_id='00000000-0000-0000-0000-000000000005'
 and w.priority='high' and w.assignment_version=1 and not w.currently_detected;
 if n<>1 or v<>1 then raise exception 'Assignment disappeared with source alert';end if;
 denied:=false;
 begin perform * from public.assign_returns_order_case_v1(
    1,1001,k,'00000000-0000-0000-0000-000000000005','critical',
    (now() at time zone 'Africa/Cairo')::date,0,'Stale write must be rejected');
 exception when others then
    denied:=sqlerrm like '%ASSIGNMENT_VERSION_CONFLICT%';
 end;
 if not denied then raise exception 'Stale assignment version accepted';end if;
 denied:=false;
 begin perform * from public.assign_returns_order_case_v1(
    1,1001,k,'00000000-0000-0000-0000-000000000006','critical',
    (now() at time zone 'Africa/Cairo')::date,1,'Cross-company assignee must fail');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-company assignee accepted';end if;
 denied:=false;
 begin perform * from public.assign_returns_order_case_v1(
    1,1001,k,'00000000-0000-0000-0000-000000000007','critical',
    (now() at time zone 'Africa/Cairo')::date,1,'Inactive assignee must fail');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Inactive assignee accepted';end if;
 perform * from public.assign_returns_order_case_v1(
  1,1001,k,'00000000-0000-0000-0000-000000000005','critical',
  (now() at time zone 'Africa/Cairo')::date+1,1,'Escalate priority and adjust due date');
 if not exists(select 1 from public.analytics_returns_case_worklist_v1(1,false,100,0) w
   where w.case_key=k and w.priority='critical' and w.assignment_version=2) then
  raise exception 'Reassignment did not increment version';end if;
 perform set_config('test.assignment.case_key',k,false);
end $$;
reset role;
-- Direct writes/reads from browser roles are forbidden.
set role authenticated;
do $$
declare denied boolean:=false;
begin
 begin perform 1 from public.otc_return_case_assignments limit 1;
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Raw assignment table accessible to browser';end if;
end $$;
reset role;
-- Force an overdue date in the ephemeral test fixture as database owner, not via RPC.
update public.otc_return_case_assignments set due_date=(now() at time zone 'Africa/Cairo')::date-1
 where case_key=current_setting('test.assignment.case_key');
set role authenticated;
do $$
declare k text;
begin
 k:=current_setting('test.assignment.case_key');
 if not exists(select 1 from public.analytics_returns_case_worklist_v1(1,false,100,0) w
  where w.case_key=k and w.is_overdue) then raise exception 'Overdue case not detected';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
declare denied boolean:=false;
begin
 begin perform 1 from public.analytics_returns_case_worklist_v1(1,false,100,0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'MAS worklist exposed to company 2 manager';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$
declare denied boolean:=false;
begin
 begin perform 1 from public.analytics_returns_case_worklist_v1(1,false,100,0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Worklist exposed to sales rep';end if;
end $$;
reset role;
select set_config('request.jwt.claim.role','anon',false);
select set_config('request.jwt.claim.sub','',false);
set role anon;
do $$
declare denied boolean:=false;
begin
 begin perform 1 from public.analytics_returns_case_worklist_v1(1,false,100,0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous worklist accessible';end if;
end $$;
reset role;
