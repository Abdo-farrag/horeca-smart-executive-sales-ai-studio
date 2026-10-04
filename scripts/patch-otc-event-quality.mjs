import fs from 'node:fs';

const file = 'supabase/migrations/20261003020000_otc_secure_rpcs.sql';
let source = fs.readFileSync(file, 'utf8');

const before = `    ), quality as (
      select count(*) filter(where link_confidence='direct')::numeric direct_count,
             count(*) filter(where link_confidence='inferred')::numeric inferred_count,
             count(*) filter(where link_confidence='unmatched')::bigint unmatched_count,
             count(*)::numeric total_count
      from filtered where event_type <> 'order'
    )`;

const after = `    ), quality_events as (
      select x.link_confidence
      from public.otc_delivery_lines x
      left join public.product_knowledge pk on pk.product_id=x.product_id
      left join public.customer_geography_odoo18 g on g.customer_id=x.customer_id and (g.company_id=x.company_id or g.company_id is null)
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
      left join public.customer_geography_odoo18 g on g.customer_id=x.customer_id and (g.company_id=x.company_id or g.company_id is null)
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
      left join public.customer_geography_odoo18 g on g.customer_id=x.customer_id and (g.company_id=x.company_id or g.company_id is null)
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
    )`;

if (!source.includes(before)) {
  throw new Error('Expected invalid event-quality block not found; refusing blind patch');
}
source = source.replace(before, after);

if (!source.includes('quality_events as (')) throw new Error('quality_events CTE missing');
if (!source.includes('from quality_events')) throw new Error('quality_events aggregation missing');

fs.writeFileSync(file, source);
console.log('patch-otc-event-quality: PASS');
