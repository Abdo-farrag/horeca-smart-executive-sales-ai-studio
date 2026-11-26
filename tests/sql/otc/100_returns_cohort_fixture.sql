-- Ephemeral PostgreSQL 17 only. Run AFTER the existing OTC audit test suite.
-- No Production connection. Source rows are synthetic.
alter table public.otc_return_lines
 add column if not exists origin_returned_move_id bigint,
 add column if not exists source_state text,
 add column if not exists return_reason text;
-- Extend synthetic evidence with subsequent-month returns for October orders.
update public.otc_return_lines
 set origin_returned_move_id=3001,source_state='done',
     return_reason='synthetic item damaged' where odoo_return_move_id=4001;
insert into public.otc_return_lines
 (odoo_return_move_id,sale_order_line_id,company_id,customer_id,salesperson_id,product_id,
  return_receipt_date,returned_qty,estimated_operational_value,link_confidence,
  origin_returned_move_id,source_state,return_reason)
values
 (4002,1102,1,101,900,501,'2026-11-05T12:00:00+00',1,10,'direct',3002,'done','synthetic November return'),
 (4003,1101,1,101,900,501,'2026-10-06T12:00:00+00',2,20,'direct',3001,'done','synthetic possible duplicate'),
 (5001,2101,2,101,902,501,'2026-11-05T12:00:00+00',1,10,'direct',3003,'done','synthetic company-two return');
-- Authorized company 2 manager for isolation tests.
insert into public.app_user_roles(user_id,is_active,role) values
 ('00000000-0000-0000-0000-000000000002',true,'manager'),
 ('00000000-0000-0000-0000-000000000003',true,'sales_rep'),
 ('00000000-0000-0000-0000-000000000004',false,'manager');
create or replace function public.authorized_company_ids()
returns setof bigint language sql stable as $$
 select case auth.uid()
  when '00000000-0000-0000-0000-000000000001'::uuid then 1::bigint
  when '00000000-0000-0000-0000-000000000002'::uuid then 2::bigint
  else null::bigint end
 where auth.uid() in (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid
 )
$$;
