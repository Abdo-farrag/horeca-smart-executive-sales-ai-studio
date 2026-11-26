-- STAGING ONLY: transactional end-to-end manager audit acceptance.
-- Every row rolls back. No Production or Odoo data is read/written.
begin;
insert into auth.users(id,aud,role) values
 ('55555555-5555-4555-8555-555555555555','authenticated','authenticated');
insert into public.app_user_roles(user_id,display_name,role,is_active) values
 ('55555555-5555-4555-8555-555555555555','Audit Test Manager','manager',true);
insert into public.otc_delivery_lines
 (odoo_move_id,odoo_picking_id,sale_order_line_id,company_id,product_id,
  delivery_date,delivered_qty,link_confidence,source_updated_at)
 values (93990001,93990001,93990010,1,9399,now(),10,'direct',now());
insert into public.otc_return_lines
 (odoo_return_move_id,odoo_return_picking_id,origin_returned_move_id,
  sale_order_line_id,company_id,product_id,return_receipt_date,
  returned_qty,link_confidence,source_updated_at)
 values (93990002,93990002,93990001,93990010,1,9399,now(),12,'direct',now());

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);

do $$
declare key text;stat text;ver integer;no_evidence bigint;history_count bigint;
begin
 select q.case_key,q.review_status,q.review_version into key,stat,ver
 from public.analytics_return_audit_review_queue_v1(1,'EXCESS_RETURN_CANDIDATE',10,0) q
 where q.product_id=9399 and q.sale_order_line_id=93990010;
 if key is null or stat<>'new' or ver<>0 then
  raise exception 'Expected new unverified excess candidate';end if;
 select sum(c.movement_count) into no_evidence
 from public.analytics_otc_return_evidence_coverage_v1(1) c
 where c.diagnostic_status='MISSING_UOM_EVIDENCE';
 if no_evidence<>1 then raise exception 'Missing UoM evidence not reported: %',no_evidence;end if;
 perform * from public.review_return_audit_candidate_v1(
  key,0,'investigating','Staging synthetic excess pending source UoM verification');
 if not exists(select 1 from public.analytics_return_audit_history_v1(1,'investigating',10,0) h
   where h.case_key=key and h.review_version=1
     and h.transition_count=1 and h.currently_detected=true)
 then raise exception 'Review history or transition count incorrect';end if;
 select count(*) into history_count from public.analytics_return_audit_history_events_v1(key);
 if history_count<>1 then raise exception 'Expected one versioned review event';end if;
end $$;

reset role;
update public.otc_return_lines set returned_qty=1
where odoo_return_move_id=93990002;
set local role authenticated;
do $$
begin
 if not exists(select 1 from public.analytics_return_audit_history_v1(1,'investigating',10,0) h
  where h.rule_code='EXCESS_RETURN_CANDIDATE'
    and h.review_version=1 and h.transition_count=1
    and h.currently_detected=false)
 then raise exception 'Disappeared candidate lost its persistent review history';end if;
end $$;
reset role;
rollback;
