-- Verified excess UoM evidence tests. Must never infer that missing evidence means zero.
do $$
begin
 if exists(select 1 from public.otc_verified_excess_return_v1) then
  raise exception 'No verified UoM evidence: should not flag'; end if;
end $$;
update public.otc_delivery_lines set source_updated_at='2026-10-10 10:00+00' where odoo_move_id=3001;
update public.otc_return_lines
 set origin_returned_move_id=3001,source_updated_at='2026-10-10 10:00+00'
 where odoo_return_move_id=4001;
-- The previous history assertions removed 4010-4012, leaving returned 2 of 10.
insert into public.otc_move_uom_evidence(
 company_id,move_kind,odoo_move_id,product_id,sale_order_line_id,
 source_qty,source_qty_field,source_uom_id,base_uom_id,base_qty,uom_category_id,
 evidence_status,quantity_semantics_verified,conversion_source,source_updated_at,verified_at,source_reference
) values
(1,'delivery',3001,501,1101,10,'quantity',5,5,10,99,'verified',true,
 'test conversion documented','2026-10-10 10:00+00',now(),'synthetic delivery 3001'),
(1,'return',4001,501,1101,2,'quantity',5,5,2,99,'verified',true,
 'test conversion documented','2026-10-10 10:00+00',now(),'synthetic return 4001');
do $$
begin
 if exists(select 1 from public.otc_verified_excess_return_v1) then
  raise exception 'Valid partial return incorrectly flagged';end if;
end $$;
insert into public.otc_return_lines
(odoo_return_move_id,sale_order_line_id,company_id,customer_id,
 salesperson_id,product_id,return_receipt_date,returned_qty,
 estimated_operational_value,link_confidence,origin_returned_move_id,source_updated_at)
values
(4090,1101,1,101,900,501,'2026-10-12',12,120,'direct',3001,'2026-10-12 10:00+00');
do $$
begin
 if exists(select 1 from public.otc_verified_excess_return_v1) then
  raise exception 'Missing return evidence must not flag verified excess';end if;
end $$;
insert into public.otc_move_uom_evidence(
 company_id,move_kind,odoo_move_id,product_id,sale_order_line_id,origin_returned_move_id,
 source_qty,source_qty_field,source_uom_id,base_uom_id,base_qty,uom_category_id,
 evidence_status,quantity_semantics_verified,conversion_source,source_updated_at,verified_at,source_reference
) values
(1,'return',4090,501,1101,3001,12,'quantity',5,5,12,99,'verified',true,
 'test conversion documented','2026-10-12 10:00+00',now(),'synthetic return 4090');
do $$
begin
 if not exists(select 1 from public.otc_verified_excess_return_v1
   where company_id=1 and sale_order_line_id=1101
   and delivered_base_qty=10 and returned_base_qty=14 and base_uom_id=5) then
  raise exception 'Complete validated same-UoM excess not detected';end if;
end $$;
-- Any snapshot quantity change invalidates prior attestation.
update public.otc_return_lines set returned_qty=11 where odoo_return_move_id=4090;
do $$
begin
 if exists(select 1 from public.otc_verified_excess_return_v1) then
  raise exception 'Stale UoM evidence is being trusted';end if;
end $$;
update public.otc_return_lines set returned_qty=12 where odoo_return_move_id=4090;
-- A mismatched UoM category cannot certify the excess.
update public.otc_move_uom_evidence set uom_category_id=100 where odoo_move_id=4090 and move_kind='return';
do $$
begin
 if exists(select 1 from public.otc_verified_excess_return_v1) then
  raise exception 'Cross-category UoM comparison was allowed';end if;
end $$;
update public.otc_move_uom_evidence set uom_category_id=99 where odoo_move_id=4090 and move_kind='return';
update public.otc_return_lines set origin_returned_move_id=null where odoo_return_move_id=4090;
do $$
begin
 if exists(select 1 from public.otc_verified_excess_return_v1) then
  raise exception 'Missing original stock move was accepted';end if;
end $$;
-- Raw data never browser readable.
do $$
begin
 if has_table_privilege('authenticated','public.otc_move_uom_evidence','SELECT') or
    has_table_privilege('anon','public.otc_move_uom_evidence','SELECT') then
  raise exception 'UoM evidence exposed to browser role';end if;
end $$;
