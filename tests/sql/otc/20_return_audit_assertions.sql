-- Synthetic checks for Issue 13. Never connect to production.
-- Existing fixture has one delivered 10 and returned 2 on order line 1101.
do $$
begin
  if exists(select 1 from public.otc_return_audit_candidates_v1) then
    raise exception 'clean baseline should have zero candidates';
  end if;
end $$;

-- A legitimate second partial return of 3 must not be labelled duplicate.
insert into public.otc_return_lines
(odoo_return_move_id,sale_order_line_id,company_id,customer_id,salesperson_id,product_id,return_receipt_date,returned_qty,estimated_operational_value,link_confidence)
values(4010,1101,1,101,900,501,'2026-10-07',3,30,'direct');
do $$
begin
 if exists(select 1 from public.otc_return_audit_candidates_v1 where rule_code in ('POSSIBLE_DUPLICATE_RETURN','EXCESS_RETURN_CANDIDATE'))
 then raise exception 'legitimate partial return was flagged'; end if;
end $$;

-- Separate Odoo stock.move, same line/quantity within one day: potential duplicate.
insert into public.otc_return_lines
(odoo_return_move_id,sale_order_line_id,company_id,customer_id,salesperson_id,product_id,return_receipt_date,returned_qty,estimated_operational_value,link_confidence)
values(4011,1101,1,101,900,501,'2026-10-07 01:00+00',3,30,'direct');
do $$
begin
 if (select count(*) from public.otc_return_audit_candidates_v1 where rule_code='POSSIBLE_DUPLICATE_RETURN')<>1
 then raise exception 'two distinct close-time Odoo returns should make one candidate pair'; end if;
 if exists(select 1 from public.otc_return_audit_candidates_v1 where rule_code='EXCESS_RETURN_CANDIDATE')
 then raise exception 'returns within delivered total should not show excess'; end if;
end $$;

-- Total 2+3+3+4=12 > delivered 10: quantity discrepancy, but UoM unverified.
insert into public.otc_return_lines
(odoo_return_move_id,sale_order_line_id,company_id,customer_id,salesperson_id,product_id,return_receipt_date,returned_qty,estimated_operational_value,link_confidence)
values(4012,1101,1,101,900,501,'2026-10-10',4,40,'direct');
do $$
begin
 if (select count(*) from public.otc_return_audit_candidates_v1 where rule_code='EXCESS_RETURN_CANDIDATE')<>1
 then raise exception 'excess total should flag exactly once per order line'; end if;
 if not exists(select 1 from public.otc_return_audit_candidates_v1
   where rule_code='EXCESS_RETURN_CANDIDATE' and delivered_qty=10 and returned_qty=12
     and confidence='review_uom_and_source_moves')
 then raise exception 'excess values or provisional evidence label incorrect'; end if;
end $$;

-- An unrelated company cannot supply delivery evidence for a return.
insert into public.otc_return_lines
(odoo_return_move_id,sale_order_line_id,company_id,customer_id,salesperson_id,product_id,return_receipt_date,returned_qty,estimated_operational_value,link_confidence)
values(4999,1101,2,101,902,501,'2026-10-10',2,20,'direct');
do $$
begin
 if not exists(select 1 from public.otc_return_audit_candidates_v1 where company_id=2
   and sale_order_line_id=1101 and rule_code='MISSING_DELIVERY_EVIDENCE')
 then raise exception 'multi-company leakage'; end if;
end $$;

insert into public.otc_return_lines
(odoo_return_move_id,sale_order_line_id,company_id,customer_id,salesperson_id,product_id,return_receipt_date,returned_qty,estimated_operational_value,link_confidence)
values(4998,null,1,101,900,501,'2026-10-10',1,10,'unmatched');
do $$
begin
 if not exists(select 1 from public.otc_return_audit_candidates_v1 where rule_code='UNLINKED_RETURN'
   and return_move_ids=array[4998]::bigint[])
 then raise exception 'unlinked return evidence missing'; end if;
 if has_table_privilege('authenticated','public.otc_return_audit_candidates_v1','SELECT')
 then raise exception 'authenticated can directly read restricted view'; end if;
 if has_table_privilege('anon','public.otc_return_audit_candidates_v1','SELECT')
 then raise exception 'anon can directly read restricted view'; end if;
end $$;
