-- Issue #13 evidence coverage; synthetic values only.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
declare total bigint;
begin
 select coalesce(sum(movement_count),0) into total
 from public.analytics_otc_return_evidence_coverage_v1();
 if total<>(select count(*) from public.otc_return_lines where company_id=1)
 then raise exception 'coverage must account for every authorized source return exactly once'; end if;
 if exists(select 1 from public.analytics_otc_return_evidence_coverage_v1() where company_id=2)
 then raise exception 'cross-company coverage leak';end if;
 if not exists(select 1 from public.analytics_otc_return_evidence_coverage_v1()
   where company_id=1 and diagnostic_status='UNVERIFIED_ORDER_LINK' and movement_count=1)
 then raise exception 'unmatched return status missing';end if;
 if not exists(select 1 from public.analytics_otc_return_evidence_coverage_v1()
   where company_id=1 and diagnostic_status='ORIGINAL_DELIVERY_NOT_IN_SNAPSHOT' and movement_count=1)
 then raise exception 'unlinked original move status missing';end if;
 if not exists(select 1 from public.analytics_otc_return_evidence_coverage_v1()
   where company_id=1 and diagnostic_status='EVIDENCE_READY' and movement_count=1)
 then raise exception 'evidence ready status missing';end if;
end $$;

-- Invalidation and recovery are visible immediately in coverage.
update public.otc_return_lines set origin_returned_move_id=3001 where odoo_return_move_id=4090;
do $$
begin
 if not exists(select 1 from public.analytics_otc_return_evidence_coverage_v1()
   where diagnostic_status='EVIDENCE_READY' and movement_count=2)
 then raise exception 'relinked source return not marked ready';end if;
end $$;
update public.otc_return_lines set returned_qty=13 where odoo_return_move_id=4090;
do $$
begin
 if not exists(select 1 from public.analytics_otc_return_evidence_coverage_v1()
   where diagnostic_status='STALE_OR_MISMATCHED_EVIDENCE' and movement_count=1)
 then raise exception 'source quantity mutation did not invalidate evidence';end if;
end $$;
update public.otc_return_lines set returned_qty=12 where odoo_return_move_id=4090;
update public.otc_move_uom_evidence set uom_category_id=100
 where move_kind='return' and odoo_move_id=4090;
do $$
begin
 if not exists(select 1 from public.analytics_otc_return_evidence_coverage_v1()
   where diagnostic_status='INCOMPATIBLE_UOM' and movement_count=1)
 then raise exception 'mismatched UoM category not reported';end if;
end $$;

do $$
declare denied boolean:=false;
begin
 begin perform * from public.analytics_otc_return_evidence_coverage_v1(2);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'unauthorized company accepted';end if;
end $$;

update public.app_user_roles set role='sales_rep';
do $$
declare denied boolean:=false;
begin
 begin perform * from public.analytics_otc_return_evidence_coverage_v1();
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'sales rep could read manager evidence summary';end if;
end $$;
update public.app_user_roles set role='manager';
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','',false);
do $$
declare denied boolean:=false;
begin
 begin perform * from public.analytics_otc_return_evidence_coverage_v1();
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'unauthenticated coverage accessible';end if;
 if has_table_privilege('authenticated','public.otc_return_evidence_status_v1','SELECT') or
    has_function_privilege('anon','public.analytics_otc_return_evidence_coverage_v1(bigint)','EXECUTE')
 then raise exception 'raw evidence coverage exposed';end if;
end $$;
