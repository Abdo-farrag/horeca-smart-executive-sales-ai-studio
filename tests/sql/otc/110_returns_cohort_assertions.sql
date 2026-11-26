-- Ephemeral PostgreSQL contract acceptance for proposed returns center RPCs.
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

do $$
declare x jsonb;detail jsonb;
begin
 select payload into x from public.analytics_returns_cohort_dashboard_v1(
  '2026-10-01','2026-10-31',1,null,'all',40,0
 );
 if x is null then raise exception 'Expected cohort payload';end if;
 if (x->'summary'->>'order_count')::int<>3 then
   raise exception 'Company 1 must have exactly 3 October orders: %',x->'summary';end if;
 if (x->'summary'->>'orders_with_returns')::int<>2 then
   raise exception 'Later-period return must be assigned to October original cohort: %',x->'summary';end if;
 if (x->>'total_rows')::int<>3 or jsonb_array_length(x->'orders')<>3 then
   raise exception 'Company 1 pagination/summary mismatch';end if;
 if x->'summary'->'return_value_rate_pct'<>'null'::jsonb then
   raise exception 'Unknown valuation-basis rate must remain null';end if;
 if x->'summary'->'unlinked_return_moves'<>'null'::jsonb then
   raise exception 'Unlinked moves cannot be attributed to order cohort';end if;
 if exists(select 1 from jsonb_array_elements(x->'orders') o
    where (o->>'company_id')::bigint=2) then
   raise exception 'Cross-company order leaked';end if;
 select payload into detail from public.analytics_returns_cohort_order_detail_v1(1,1002);
 if detail->>'order_name'<>'HS1002' or
    (select count(*) from jsonb_array_elements(detail->'returns') r
     where r->>'receipt_date' like '2026-11-05%')<>1 then
   raise exception 'October order must include its November return';end if;
 if (detail->>'company_id')::int<>1 or (detail->>'order_id')::int<>1002 then
   raise exception 'Detail identity mismatch';end if;
end $$;

-- Company 2 must not see company 1.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
declare x jsonb;denied bool:=false;
begin
 select payload into x from public.analytics_returns_cohort_dashboard_v1(
  '2026-10-01','2026-10-31',null,null,'all',40,0);
 if (x->'summary'->>'order_count')::int<>1 or
   (x->'orders'->0->>'company_id')::int<>2 then
  raise exception 'Manager company 2 leaked data';end if;
 begin
  perform * from public.analytics_returns_cohort_order_detail_v1(1,1001);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Cross-company detail not denied';end if;
end $$;
-- Sales rep forbidden.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$
declare denied bool:=false;
begin
 begin perform * from public.analytics_returns_cohort_dashboard_v1(
  '2026-10-01','2026-10-31',1,null,'all',40,0);
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Sales rep not denied';end if;
end $$;
-- Inactive manager forbidden.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$
declare denied bool:=false;
begin
 begin perform * from public.analytics_returns_cohort_dashboard_v1(
  '2026-10-01','2026-10-31',1,null,'all',40,0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Inactive manager not denied';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','anon',false);
set role anon;
do $$
declare denied bool:=false;
begin
 begin
  perform * from public.analytics_returns_cohort_dashboard_v1(
   '2026-10-01','2026-10-31',1,null,'all',40,0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous review access not denied';end if;
end $$;
reset role;
