-- Order-level shipping geography, preserving RPC permissions.
-- Applies after 740 and 755; changes only reconciliation view and Trend RPC.
begin;
create or replace view public.otc_sale_line_reconciliation_v1
with (security_invoker = true)
as
with delivery as (
  select
    sale_order_line_id,
    sum(delivered_qty) as gross_delivered_qty,
    sum(coalesce(delivered_value, 0)) as gross_delivered_value,
    min(delivery_date) as first_delivery_at,
    max(delivery_date) as last_delivery_at,
    count(*) filter (where link_confidence = 'inferred') as inferred_delivery_events
  from public.otc_delivery_lines
  where sale_order_line_id is not null
  group by sale_order_line_id
), returns as (
  select
    sale_order_line_id,
    sum(returned_qty) as returned_qty,
    sum(coalesce(estimated_operational_value, 0)) as returned_value,
    min(return_receipt_date) as first_return_at,
    max(return_receipt_date) as last_return_at,
    count(*) filter (where link_confidence = 'inferred') as inferred_return_events
  from public.otc_return_lines
  where sale_order_line_id is not null
  group by sale_order_line_id
), invoice as (
  select
    sale_order_line_id,
    sum(abs(quantity)) filter (where move_type = 'out_invoice') as gross_invoiced_qty,
    sum(abs(price_subtotal)) filter (where move_type = 'out_invoice') as gross_invoiced_value,
    sum(abs(quantity)) filter (where move_type = 'out_refund') as credit_note_qty,
    sum(abs(price_subtotal)) filter (where move_type = 'out_refund') as credit_note_value,
    min(invoice_date) filter (where move_type = 'out_invoice') as first_invoice_date,
    max(invoice_date) filter (where move_type = 'out_invoice') as last_invoice_date,
    min(invoice_date) filter (where move_type = 'out_refund') as first_credit_note_date,
    max(invoice_date) filter (where move_type = 'out_refund') as last_credit_note_date
  from public.otc_invoice_lines
  where sale_order_line_id is not null
    and allocation_status = 'single_link'
    and source_state = 'posted'
  group by sale_order_line_id
)
select
  o.odoo_line_id as sale_order_line_id,
  o.order_id,
  o.order_name,
  o.order_date,
  o.company_id,
  o.company_name,
  o.customer_id,
  o.customer_name,
  s.salesperson_id,
  o.salesperson as salesperson_name,
  o.product_id,
  o.product_name,
  pk.brand,
  coalesce(pk.category, o.product_category) as category,
  case when (ad.area_code is not null or (g.area_code is null and ad.governorate_code is not null)) then ad.governorate_code else g.governorate_code end as governorate_code,
  case when (ad.area_code is not null or (g.area_code is null and ad.governorate_code is not null)) then ad.governorate_name_ar else g.governorate_name_ar end as governorate_name_ar,
  case when (ad.area_code is not null or (g.area_code is null and ad.governorate_code is not null)) then ad.area_code else g.area_code end as area_code,
  case when (ad.area_code is not null or (g.area_code is null and ad.governorate_code is not null)) then ad.area_name_ar else g.area_name_ar end as area_name_ar,
  coalesce(o.qty_sold, 0)::numeric as ordered_qty,
  coalesce(o.subtotal, 0)::numeric as ordered_value,
  coalesce(d.gross_delivered_qty, 0)::numeric as gross_delivered_qty,
  coalesce(d.gross_delivered_value, 0)::numeric as gross_delivered_value,
  coalesce(r.returned_qty, 0)::numeric as returned_qty,
  coalesce(r.returned_value, 0)::numeric as returned_value,
  (coalesce(d.gross_delivered_qty, 0) - coalesce(r.returned_qty, 0))::numeric as net_delivered_qty,
  (coalesce(d.gross_delivered_value, 0) - coalesce(r.returned_value, 0))::numeric as net_delivered_value,
  coalesce(i.gross_invoiced_qty, 0)::numeric as gross_invoiced_qty,
  coalesce(i.gross_invoiced_value, 0)::numeric as gross_invoiced_value,
  coalesce(i.credit_note_qty, 0)::numeric as credit_note_qty,
  coalesce(i.credit_note_value, 0)::numeric as credit_note_value,
  (coalesce(i.gross_invoiced_qty, 0) - coalesce(i.credit_note_qty, 0))::numeric as net_invoiced_qty,
  (coalesce(i.gross_invoiced_value, 0) - coalesce(i.credit_note_value, 0))::numeric as net_invoiced_value,
  (coalesce(o.qty_sold, 0) - coalesce(d.gross_delivered_qty, 0))::numeric as delivery_gap_qty,
  (coalesce(o.subtotal, 0) - coalesce(d.gross_delivered_value, 0))::numeric as delivery_gap_value,
  (coalesce(d.gross_delivered_qty, 0) - coalesce(i.gross_invoiced_qty, 0))::numeric as invoice_gap_qty,
  (coalesce(d.gross_delivered_value, 0) - coalesce(i.gross_invoiced_value, 0))::numeric as invoice_gap_value,
  case when coalesce(d.gross_delivered_qty, 0) = 0 then 0
       else round((coalesce(r.returned_qty, 0) / nullif(d.gross_delivered_qty, 0)) * 100, 4)
  end::numeric as return_rate_pct,
  d.first_delivery_at,
  d.last_delivery_at,
  r.first_return_at,
  r.last_return_at,
  i.first_invoice_date,
  i.last_invoice_date,
  i.first_credit_note_date,
  i.last_credit_note_date,
  coalesce(d.inferred_delivery_events, 0)::bigint as inferred_delivery_events,
  coalesce(r.inferred_return_events, 0)::bigint as inferred_return_events
from public.product_sales_from_june1 o
left join public.sales_orders_odoo18_secure s on s.order_id = o.order_id
left join delivery d on d.sale_order_line_id = o.odoo_line_id
left join returns r on r.sale_order_line_id = o.odoo_line_id
left join invoice i on i.sale_order_line_id = o.odoo_line_id
left join public.product_knowledge pk on pk.product_id = o.product_id
left join public.customer_geography_dimension g
  on g.customer_id = o.customer_id
 and g.company_id = o.company_id
left join public.otc_order_shipping_dimension sh
  on sh.order_id = o.order_id and sh.company_id = o.company_id
left join public.customer_delivery_address_dimension ad
  on ad.delivery_partner_id = sh.delivery_partner_id and ad.company_id = sh.company_id;



create or replace function public.analytics_order_to_cash_trend_v1(
  p_start_date date,
  p_end_date date,
  p_company_name text default null,
  p_salesperson_id bigint default null,
  p_customer_id bigint default null,
  p_product_id bigint default null,
  p_brand text default null,
  p_category text default null,
  p_governorate_code text default null,
  p_area_code text default null,
  p_date_basis text default 'event',
  p_grain text default 'day'
)
returns table (
  period_start date,
  date_basis text,
  ordered_value numeric,
  gross_delivered_value numeric,
  returned_value numeric,
  net_delivered_value numeric,
  gross_invoiced_value numeric,
  credit_note_value numeric,
  net_invoiced_value numeric
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_basis text := lower(coalesce(p_date_basis,'event'));
  v_grain text := lower(coalesce(p_grain,'day'));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_start_date is null or p_end_date is null or p_start_date>p_end_date then raise exception 'INVALID_DATE_RANGE'; end if;
  if v_basis not in ('event','order','delivery','return','invoice','credit_note') then raise exception 'INVALID_DATE_BASIS'; end if;
  if v_grain not in ('day','month') then raise exception 'INVALID_GRAIN'; end if;

  return query
  with events as (
    select o.order_date::date event_date, 'order'::text event_type, o.subtotal::numeric val, o.company_id, s.salesperson_id, o.customer_id, o.product_id, pk.brand, coalesce(pk.category,o.product_category) category,
      case when (ad.area_code is not null or (g.area_code is null and ad.governorate_code is not null)) then ad.governorate_code else g.governorate_code end,
      case when (ad.area_code is not null or (g.area_code is null and ad.governorate_code is not null)) then ad.area_code else g.area_code end,
      null::text link_confidence
    from public.product_sales_from_june1 o
    left join public.sales_orders_odoo18_secure s on s.order_id=o.order_id
    left join public.product_knowledge pk on pk.product_id=o.product_id
    left join public.customer_geography_dimension g on g.customer_id=o.customer_id and g.company_id=o.company_id
    left join public.otc_order_shipping_dimension sh on sh.order_id=o.order_id and sh.company_id=o.company_id
    left join public.customer_delivery_address_dimension ad on ad.company_id=sh.company_id and ad.delivery_partner_id=sh.delivery_partner_id
    union all
    select d.delivery_date::date,'delivery',coalesce(d.delivered_value,0),d.company_id,d.salesperson_id,d.customer_id,d.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,d.link_confidence
    from public.otc_delivery_lines d left join public.product_knowledge pk on pk.product_id=d.product_id left join public.otc_delivery_geography_v1 g on g.odoo_move_id=d.odoo_move_id
    union all
    select r.return_receipt_date::date,'return',coalesce(r.estimated_operational_value,0),r.company_id,r.salesperson_id,r.customer_id,r.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,r.link_confidence
    from public.otc_return_lines r left join public.product_knowledge pk on pk.product_id=r.product_id left join public.otc_return_geography_v1 g on g.odoo_return_move_id=r.odoo_return_move_id
    union all
    select i.invoice_date,case when i.move_type='out_invoice' then 'invoice' else 'credit_note' end,abs(i.price_subtotal),i.company_id,i.salesperson_id,i.customer_id,i.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,i.link_confidence
    from public.otc_invoice_lines i left join public.product_knowledge pk on pk.product_id=i.product_id left join public.customer_geography_dimension g on g.customer_id=i.customer_id and g.company_id=i.company_id
    where i.source_state='posted'
  ), filtered as (
    select e.*
    from events e
    where e.event_date between p_start_date and p_end_date
      and public.otc_scope_row_allowed(e.company_id,e.salesperson_id)
      and (v_basis='event' or e.event_type=v_basis)
      and (p_company_name is null or case e.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end=p_company_name)
      and (p_salesperson_id is null or e.salesperson_id=p_salesperson_id)
      and (p_customer_id is null or e.customer_id=p_customer_id)
      and (p_product_id is null or e.product_id=p_product_id)
      and (p_brand is null or e.brand=p_brand) and (p_category is null or e.category=p_category)
      and (p_governorate_code is null or e.governorate_code=p_governorate_code) and (p_area_code is null or e.area_code=p_area_code)
  ), grouped as (
    select (case when v_grain='month' then date_trunc('month',event_date)::date else event_date end) period_start,
      coalesce(sum(val) filter(where event_type='order'),0)::numeric ordered,
      coalesce(sum(val) filter(where event_type='delivery'),0)::numeric delivered,
      coalesce(sum(val) filter(where event_type='return'),0)::numeric returned,
      coalesce(sum(val) filter(where event_type='invoice'),0)::numeric invoiced,
      coalesce(sum(val) filter(where event_type='credit_note'),0)::numeric credited
    from filtered group by 1
  )
  select g.period_start,v_basis,g.ordered,g.delivered,g.returned,g.delivered-g.returned,g.invoiced,g.credited,g.invoiced-g.credited
  from grouped g order by g.period_start;
end;
$$;



commit;
