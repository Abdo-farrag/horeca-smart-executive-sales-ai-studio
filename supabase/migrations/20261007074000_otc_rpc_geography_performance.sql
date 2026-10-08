-- OTC RPC geography performance: materialized customer/address dimensions, no per-line keyword matching.
-- Delivery/return events use actual delivery partner; order/invoice geography is customer-level fallback until order shipping identity is synced.
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
  g.governorate_code,
  g.governorate_name_ar,
  g.area_code,
  g.area_name_ar,
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
 and g.company_id = o.company_id;


create or replace function public.analytics_order_to_cash_kpis_v1(
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
  p_date_basis text default 'order_cohort'
)
returns table (
  date_basis text,
  ordered_qty numeric,
  ordered_value numeric,
  gross_delivered_qty numeric,
  gross_delivered_value numeric,
  returned_qty numeric,
  returned_value numeric,
  net_delivered_qty numeric,
  net_delivered_value numeric,
  gross_invoiced_qty numeric,
  gross_invoiced_value numeric,
  credit_note_qty numeric,
  credit_note_value numeric,
  net_invoiced_qty numeric,
  net_invoiced_value numeric,
  delivery_gap_qty numeric,
  delivery_gap_value numeric,
  invoice_gap_qty numeric,
  invoice_gap_value numeric,
  return_rate_pct numeric,
  uncredited_returns_count bigint,
  uncredited_returns_value numeric,
  direct_link_pct numeric,
  inferred_link_pct numeric,
  unmatched_link_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_basis text := lower(coalesce(p_date_basis, 'order_cohort'));
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'INVALID_DATE_RANGE';
  end if;
  if v_basis not in ('order_cohort', 'event') then
    raise exception 'INVALID_DATE_BASIS';
  end if;

  if v_basis = 'order_cohort' then
    return query
    with cohort as (
      select v.*
      from public.otc_sale_line_reconciliation_v1 v
      where v.order_date::date between p_start_date and p_end_date
        and public.otc_scope_row_allowed(v.company_id, v.salesperson_id)
        and (p_company_name is null or v.company_name = p_company_name)
        and (p_salesperson_id is null or v.salesperson_id = p_salesperson_id)
        and (p_customer_id is null or v.customer_id = p_customer_id)
        and (p_product_id is null or v.product_id = p_product_id)
        and (p_brand is null or v.brand = p_brand)
        and (p_category is null or v.category = p_category)
        and (p_governorate_code is null or v.governorate_code = p_governorate_code)
        and (p_area_code is null or v.area_code = p_area_code)
    ), uncredited as (
      select
        count(*)::bigint as cnt,
        coalesce(sum(r.estimated_operational_value), 0)::numeric as val
      from public.otc_return_lines r
      join cohort c on c.sale_order_line_id = r.sale_order_line_id
      where r.return_receipt_date::date <= p_end_date
        and not exists (
          select 1
          from public.otc_invoice_lines i
          where i.move_type = 'out_refund'
            and i.source_state = 'posted'
            and i.sale_order_line_id = r.sale_order_line_id
            and i.product_id = r.product_id
            and i.invoice_date <= p_end_date
        )
    ), quality as (
      select
        count(*) filter (where x.link_confidence = 'direct')::numeric as direct_count,
        count(*) filter (where x.link_confidence = 'inferred')::numeric as inferred_count,
        count(*) filter (where x.link_confidence = 'unmatched')::bigint as unmatched_count,
        count(*)::numeric as total_count
      from (
        select d.link_confidence
        from public.otc_delivery_lines d join cohort c on c.sale_order_line_id = d.sale_order_line_id
        union all
        select r.link_confidence
        from public.otc_return_lines r join cohort c on c.sale_order_line_id = r.sale_order_line_id
        union all
        select i.link_confidence
        from public.otc_invoice_lines i join cohort c on c.sale_order_line_id = i.sale_order_line_id
      ) x
    )
    select
      v_basis,
      coalesce(sum(c.ordered_qty), 0), coalesce(sum(c.ordered_value), 0),
      coalesce(sum(c.gross_delivered_qty), 0), coalesce(sum(c.gross_delivered_value), 0),
      coalesce(sum(c.returned_qty), 0), coalesce(sum(c.returned_value), 0),
      coalesce(sum(c.net_delivered_qty), 0), coalesce(sum(c.net_delivered_value), 0),
      coalesce(sum(c.gross_invoiced_qty), 0), coalesce(sum(c.gross_invoiced_value), 0),
      coalesce(sum(c.credit_note_qty), 0), coalesce(sum(c.credit_note_value), 0),
      coalesce(sum(c.net_invoiced_qty), 0), coalesce(sum(c.net_invoiced_value), 0),
      coalesce(sum(c.delivery_gap_qty), 0), coalesce(sum(c.delivery_gap_value), 0),
      coalesce(sum(c.invoice_gap_qty), 0), coalesce(sum(c.invoice_gap_value), 0),
      case when coalesce(sum(c.gross_delivered_qty), 0) = 0 then 0
           else round(coalesce(sum(c.returned_qty), 0) / nullif(sum(c.gross_delivered_qty), 0) * 100, 4) end,
      u.cnt, u.val,
      case when q.total_count = 0 then 0 else round(q.direct_count / q.total_count * 100, 4) end,
      case when q.total_count = 0 then 0 else round(q.inferred_count / q.total_count * 100, 4) end,
      q.unmatched_count
    from cohort c cross join uncredited u cross join quality q
    group by u.cnt, u.val, q.total_count, q.direct_count, q.inferred_count, q.unmatched_count;
  else
    return query
    with ordered as (
      select v.*
      from public.otc_sale_line_reconciliation_v1 v
      where v.order_date::date between p_start_date and p_end_date
        and public.otc_scope_row_allowed(v.company_id, v.salesperson_id)
        and (p_company_name is null or v.company_name = p_company_name)
        and (p_salesperson_id is null or v.salesperson_id = p_salesperson_id)
        and (p_customer_id is null or v.customer_id = p_customer_id)
        and (p_product_id is null or v.product_id = p_product_id)
        and (p_brand is null or v.brand = p_brand)
        and (p_category is null or v.category = p_category)
        and (p_governorate_code is null or v.governorate_code = p_governorate_code)
        and (p_area_code is null or v.area_code = p_area_code)
    ), d as (
      select coalesce(sum(x.delivered_qty),0)::numeric q, coalesce(sum(x.delivered_value),0)::numeric v
      from public.otc_delivery_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_dimension g on g.customer_id=x.customer_id and g.company_id=x.company_id
      where x.delivery_date::date between p_start_date and p_end_date
        and public.otc_scope_row_allowed(x.company_id,x.salesperson_id)
        and (p_company_name is null or case x.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end = p_company_name)
        and (p_salesperson_id is null or x.salesperson_id=p_salesperson_id)
        and (p_customer_id is null or x.customer_id=p_customer_id)
        and (p_product_id is null or x.product_id=p_product_id)
        and (p_brand is null or pk.brand=p_brand) and (p_category is null or pk.category=p_category)
        and (p_governorate_code is null or g.governorate_code=p_governorate_code) and (p_area_code is null or g.area_code=p_area_code)
    ), r as (
      select coalesce(sum(x.returned_qty),0)::numeric q, coalesce(sum(x.estimated_operational_value),0)::numeric v,
             count(*) filter (where not exists (select 1 from public.otc_invoice_lines i where i.move_type='out_refund' and i.source_state='posted' and i.sale_order_line_id=x.sale_order_line_id and i.product_id=x.product_id and i.invoice_date<=p_end_date))::bigint uncredited_count,
             coalesce(sum(x.estimated_operational_value) filter (where not exists (select 1 from public.otc_invoice_lines i where i.move_type='out_refund' and i.source_state='posted' and i.sale_order_line_id=x.sale_order_line_id and i.product_id=x.product_id and i.invoice_date<=p_end_date)),0)::numeric uncredited_value
      from public.otc_return_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_dimension g on g.customer_id=x.customer_id and g.company_id=x.company_id
      where x.return_receipt_date::date between p_start_date and p_end_date
        and public.otc_scope_row_allowed(x.company_id,x.salesperson_id)
        and (p_company_name is null or case x.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end = p_company_name)
        and (p_salesperson_id is null or x.salesperson_id=p_salesperson_id)
        and (p_customer_id is null or x.customer_id=p_customer_id)
        and (p_product_id is null or x.product_id=p_product_id)
        and (p_brand is null or pk.brand=p_brand) and (p_category is null or pk.category=p_category)
        and (p_governorate_code is null or g.governorate_code=p_governorate_code) and (p_area_code is null or g.area_code=p_area_code)
    ), inv as (
      select
        coalesce(sum(abs(x.quantity)) filter (where x.move_type='out_invoice'),0)::numeric iq,
        coalesce(sum(abs(x.price_subtotal)) filter (where x.move_type='out_invoice'),0)::numeric iv,
        coalesce(sum(abs(x.quantity)) filter (where x.move_type='out_refund'),0)::numeric cq,
        coalesce(sum(abs(x.price_subtotal)) filter (where x.move_type='out_refund'),0)::numeric cv
      from public.otc_invoice_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_dimension g on g.customer_id=x.customer_id and g.company_id=x.company_id
      where x.invoice_date between p_start_date and p_end_date and x.source_state='posted'
        and public.otc_scope_row_allowed(x.company_id,x.salesperson_id)
        and (p_company_name is null or case x.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end = p_company_name)
        and (p_salesperson_id is null or x.salesperson_id=p_salesperson_id)
        and (p_customer_id is null or x.customer_id=p_customer_id)
        and (p_product_id is null or x.product_id=p_product_id)
        and (p_brand is null or pk.brand=p_brand) and (p_category is null or pk.category=p_category)
        and (p_governorate_code is null or g.governorate_code=p_governorate_code) and (p_area_code is null or g.area_code=p_area_code)
    ), quality_events as (
      select x.link_confidence
      from public.otc_delivery_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_dimension g on g.customer_id=x.customer_id and g.company_id=x.company_id
      where x.delivery_date::date between p_start_date and p_end_date
        and public.otc_scope_row_allowed(x.company_id,x.salesperson_id)
        and (p_company_name is null or case x.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end = p_company_name)
        and (p_salesperson_id is null or x.salesperson_id=p_salesperson_id)
        and (p_customer_id is null or x.customer_id=p_customer_id)
        and (p_product_id is null or x.product_id=p_product_id)
        and (p_brand is null or pk.brand=p_brand)
        and (p_category is null or pk.category=p_category)
        and (p_governorate_code is null or g.governorate_code=p_governorate_code)
        and (p_area_code is null or g.area_code=p_area_code)
      union all
      select x.link_confidence
      from public.otc_return_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_dimension g on g.customer_id=x.customer_id and g.company_id=x.company_id
      where x.return_receipt_date::date between p_start_date and p_end_date
        and public.otc_scope_row_allowed(x.company_id,x.salesperson_id)
        and (p_company_name is null or case x.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end = p_company_name)
        and (p_salesperson_id is null or x.salesperson_id=p_salesperson_id)
        and (p_customer_id is null or x.customer_id=p_customer_id)
        and (p_product_id is null or x.product_id=p_product_id)
        and (p_brand is null or pk.brand=p_brand)
        and (p_category is null or pk.category=p_category)
        and (p_governorate_code is null or g.governorate_code=p_governorate_code)
        and (p_area_code is null or g.area_code=p_area_code)
      union all
      select x.link_confidence
      from public.otc_invoice_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_dimension g on g.customer_id=x.customer_id and g.company_id=x.company_id
      where x.invoice_date between p_start_date and p_end_date
        and x.source_state='posted'
        and public.otc_scope_row_allowed(x.company_id,x.salesperson_id)
        and (p_company_name is null or case x.company_id when 1 then 'MAS' when 2 then 'Horeca Smart' end = p_company_name)
        and (p_salesperson_id is null or x.salesperson_id=p_salesperson_id)
        and (p_customer_id is null or x.customer_id=p_customer_id)
        and (p_product_id is null or x.product_id=p_product_id)
        and (p_brand is null or pk.brand=p_brand)
        and (p_category is null or pk.category=p_category)
        and (p_governorate_code is null or g.governorate_code=p_governorate_code)
        and (p_area_code is null or g.area_code=p_area_code)
    ), quality as (
      select count(*) filter(where link_confidence='direct')::numeric direct_count,
             count(*) filter(where link_confidence='inferred')::numeric inferred_count,
             count(*) filter(where link_confidence='unmatched')::bigint unmatched_count,
             count(*)::numeric total_count
      from quality_events
    )
    select v_basis,
      coalesce(sum(o.ordered_qty),0), coalesce(sum(o.ordered_value),0), d.q,d.v,r.q,r.v,
      d.q-r.q,d.v-r.v,inv.iq,inv.iv,inv.cq,inv.cv,inv.iq-inv.cq,inv.iv-inv.cv,
      coalesce(sum(o.ordered_qty),0)-d.q,coalesce(sum(o.ordered_value),0)-d.v,d.q-inv.iq,d.v-inv.iv,
      case when d.q=0 then 0 else round(r.q/nullif(d.q,0)*100,4) end,
      r.uncredited_count,r.uncredited_value,
      case when q.total_count=0 then 0 else round(q.direct_count/q.total_count*100,4) end,
      case when q.total_count=0 then 0 else round(q.inferred_count/q.total_count*100,4) end,
      q.unmatched_count
    from ordered o cross join d cross join r cross join inv cross join quality q
    group by d.q,d.v,r.q,r.v,r.uncredited_count,r.uncredited_value,inv.iq,inv.iv,inv.cq,inv.cv,q.total_count,q.direct_count,q.inferred_count,q.unmatched_count;
  end if;
end;
$$;

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
    select o.order_date::date event_date, 'order'::text event_type, o.subtotal::numeric val, o.company_id, s.salesperson_id, o.customer_id, o.product_id, pk.brand, coalesce(pk.category,o.product_category) category, g.governorate_code,g.area_code,null::text link_confidence
    from public.product_sales_from_june1 o left join public.sales_orders_odoo18_secure s on s.order_id=o.order_id left join public.product_knowledge pk on pk.product_id=o.product_id left join public.customer_geography_dimension g on g.customer_id=o.customer_id and g.company_id=o.company_id
    union all
    select d.delivery_date::date,'delivery',coalesce(d.delivered_value,0),d.company_id,d.salesperson_id,d.customer_id,d.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,d.link_confidence
    from public.otc_delivery_lines d left join public.product_knowledge pk on pk.product_id=d.product_id left join public.otc_delivery_geography_v1 g on g.odoo_move_id=d.odoo_move_id
    union all
    select r.return_receipt_date::date,'return',coalesce(r.estimated_operational_value,0),r.company_id,r.salesperson_id,r.customer_id,r.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,r.link_confidence
    from public.otc_return_lines r left join public.product_knowledge pk on pk.product_id=r.product_id left join public.otc_return_geography_v1 g on g.odoo_return_move_id=r.odoo_return_move_id
    union all
    select i.invoice_date,case when i.move_type='out_invoice' then 'invoice' else 'credit_note' end,abs(i.price_subtotal),i.company_id,i.salesperson_id,i.customer_id,i.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,i.link_confidence
    from public.otc_invoice_lines i left join public.product_knowledge pk on pk.product_id=i.product_id left join public.customer_geography_odoo18 g on g.customer_id=i.customer_id and (g.company_id=i.company_id or g.company_id is null)
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
