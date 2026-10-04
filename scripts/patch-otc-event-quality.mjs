import fs from 'node:fs';

const file = 'supabase/migrations/20261003020000_otc_secure_rpcs.sql';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  [
    "select o.order_date::date event_date, 'order'::text event_type, o.subtotal::numeric val, o.company_id, s.salesperson_id, o.customer_id, o.product_id, pk.brand, coalesce(pk.category,o.product_category) category, g.governorate_code,g.area_code",
    "select o.order_date::date event_date, 'order'::text event_type, o.subtotal::numeric val, o.company_id, s.salesperson_id, o.customer_id, o.product_id, pk.brand, coalesce(pk.category,o.product_category) category, g.governorate_code,g.area_code,null::text link_confidence",
  ],
  [
    "select d.delivery_date::date,'delivery',coalesce(d.delivered_value,0),d.company_id,d.salesperson_id,d.customer_id,d.product_id,pk.brand,pk.category,g.governorate_code,g.area_code",
    "select d.delivery_date::date,'delivery',coalesce(d.delivered_value,0),d.company_id,d.salesperson_id,d.customer_id,d.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,d.link_confidence",
  ],
  [
    "select r.return_receipt_date::date,'return',coalesce(r.estimated_operational_value,0),r.company_id,r.salesperson_id,r.customer_id,r.product_id,pk.brand,pk.category,g.governorate_code,g.area_code",
    "select r.return_receipt_date::date,'return',coalesce(r.estimated_operational_value,0),r.company_id,r.salesperson_id,r.customer_id,r.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,r.link_confidence",
  ],
  [
    "select i.invoice_date,case when i.move_type='out_invoice' then 'invoice' else 'credit_note' end,abs(i.price_subtotal),i.company_id,i.salesperson_id,i.customer_id,i.product_id,pk.brand,pk.category,g.governorate_code,g.area_code",
    "select i.invoice_date,case when i.move_type='out_invoice' then 'invoice' else 'credit_note' end,abs(i.price_subtotal),i.company_id,i.salesperson_id,i.customer_id,i.product_id,pk.brand,pk.category,g.governorate_code,g.area_code,i.link_confidence",
  ],
  [
`    ), quality as (
      select count(*) filter(where link_confidence='direct')::numeric direct_count,
             count(*) filter(where link_confidence='inferred')::numeric inferred_count,
             count(*) filter(where link_confidence='unmatched')::bigint unmatched_count,
             count(*)::numeric total_count
      from (
        select link_confidence from public.otc_delivery_lines where delivery_date::date between p_start_date and p_end_date
        union all select link_confidence from public.otc_return_lines where return_receipt_date::date between p_start_date and p_end_date
        union all select link_confidence from public.otc_invoice_lines where invoice_date between p_start_date and p_end_date
      ) q
    )`,
`    ), quality as (
      select count(*) filter(where link_confidence='direct')::numeric direct_count,
             count(*) filter(where link_confidence='inferred')::numeric inferred_count,
             count(*) filter(where link_confidence='unmatched')::bigint unmatched_count,
             count(*)::numeric total_count
      from filtered where event_type <> 'order'
    )`,
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Expected OTC migration fragment not found:\n${before.slice(0, 180)}`);
  }
  source = source.replace(before, after);
}

if (!source.includes('null::text link_confidence')) throw new Error('order link confidence patch missing');
if (!source.includes("from filtered where event_type <> 'order'")) throw new Error('scoped quality patch missing');

fs.writeFileSync(file, source);
console.log('patch-otc-event-quality: PASS');
