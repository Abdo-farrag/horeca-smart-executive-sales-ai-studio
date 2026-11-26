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
-- Force a deliberate overlapping Odoo order ID across the two companies.
-- The UI/detail key MUST include company_id; same numeric ID is not globally unique.
update public.product_sales_from_june1 set order_id=1001
 where company_id=2 and odoo_line_id=2101;
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

-- The production-shaped canonical line reconciliation view is not part of the
-- earlier synthetic October migration fixture. Recreate its relevant *contract*
-- using independent line-level aggregates to ensure one row per sale line.
create view public.otc_sale_line_reconciliation_canonical_v1 as
with deliveries as (
 select company_id,sale_order_line_id,sum(delivered_qty) gross_delivered_qty,
        sum(delivered_value) gross_delivered_value
 from public.otc_delivery_lines group by company_id,sale_order_line_id
), returns as (
 select company_id,sale_order_line_id,sum(returned_qty) returned_qty,
        sum(estimated_operational_value) returned_value
 from public.otc_return_lines group by company_id,sale_order_line_id
), invoices as (
 select company_id,sale_order_line_id,
        coalesce(sum(price_subtotal) filter(where move_type='out_invoice'),0) gross_invoiced_value,
        coalesce(sum(price_subtotal) filter(where move_type='out_refund'),0) credit_note_value
 from public.otc_invoice_lines group by company_id,sale_order_line_id
)
select s.odoo_line_id sale_order_line_id,s.order_id,s.order_name,s.order_date,
 s.company_id,s.company_name,s.customer_id,s.customer_name,
 s.salesperson salesperson_name,s.product_id,s.product_name,
 s.qty_sold ordered_qty,s.subtotal ordered_value,
 coalesce(d.gross_delivered_qty,0) gross_delivered_qty,
 coalesce(d.gross_delivered_value,0) gross_delivered_value,
 coalesce(r.returned_qty,0) returned_qty,
 coalesce(r.returned_value,0) returned_value,
 coalesce(i.gross_invoiced_value,0) gross_invoiced_value,
 coalesce(i.credit_note_value,0) credit_note_value,
 0::bigint inferred_return_events
from public.product_sales_from_june1 s
left join deliveries d on d.company_id=s.company_id and d.sale_order_line_id=s.odoo_line_id
left join returns r on r.company_id=s.company_id and r.sale_order_line_id=s.odoo_line_id
left join invoices i on i.company_id=s.company_id and i.sale_order_line_id=s.odoo_line_id;
