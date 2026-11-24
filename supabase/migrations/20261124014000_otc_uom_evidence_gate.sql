-- Issue #13 — evidence-first UoM validation gate. Does NOT change sync or OTC figures.
-- Rows can only be populated after independent Odoo 18 field-semantics verification.
begin;
create table public.otc_move_uom_evidence (
  company_id bigint not null check (company_id in (1,2)),
  move_kind text not null check (move_kind in ('delivery','return')),
  odoo_move_id bigint not null check (odoo_move_id>0),
  product_id bigint not null check (product_id>0),
  sale_order_line_id bigint,
  origin_returned_move_id bigint,
  source_qty numeric not null check (source_qty>=0),
  source_qty_field text not null check (source_qty_field in ('quantity','product_uom_qty')),
  source_uom_id bigint not null check (source_uom_id>0),
  base_uom_id bigint not null check (base_uom_id>0),
  base_qty numeric check (base_qty>=0),
  uom_category_id bigint,
  evidence_status text not null default 'unverified'
    check (evidence_status in ('unverified','verified','rejected')),
  quantity_semantics_verified boolean not null default false,
  conversion_source text,
  source_updated_at timestamptz,
  verified_at timestamptz,
  source_reference text,
  last_synced_at timestamptz not null default now(),
  primary key(company_id,move_kind,odoo_move_id),
  constraint verified_uom_needs_evidence check (
    evidence_status <> 'verified' or (
      quantity_semantics_verified = true
      and base_qty is not null
      and uom_category_id is not null
      and verified_at is not null
      and nullif(btrim(coalesce(conversion_source,'')),'') is not null
      and nullif(btrim(coalesce(source_reference,'')),'') is not null
    )
  )
);
create index otc_move_uom_evidence_line_idx
  on public.otc_move_uom_evidence(company_id,sale_order_line_id,product_id,move_kind);
alter table public.otc_move_uom_evidence enable row level security;
revoke all on public.otc_move_uom_evidence from public,anon,authenticated;
grant all on public.otc_move_uom_evidence to service_role;

-- Only claim verified excess when (1) complete snapshot move coverage,
-- (2) same product/base UoM and category, (3) verified source quantity
-- semantics, and (4) original delivery evidence for linked return moves.
-- Missing evidence remains unknown, NEVER a zero.
create or replace view public.otc_verified_excess_return_v1
with (security_invoker=true) as
with ds as (
 select d.company_id,d.sale_order_line_id,d.product_id,
        count(*)::bigint total_count,
        count(e.odoo_move_id) filter (
          where e.evidence_status='verified'
            and e.quantity_semantics_verified
            and e.source_updated_at is not distinct from d.source_updated_at
            and e.product_id=d.product_id
            and e.sale_order_line_id=d.sale_order_line_id
            and e.base_qty is not null
        )::bigint valid_count,
        sum(e.base_qty) filter (where e.evidence_status='verified') base_qty,
        min(e.base_uom_id) base_uom_min,max(e.base_uom_id) base_uom_max,
        min(e.uom_category_id) cat_min,max(e.uom_category_id) cat_max
 from public.otc_delivery_lines d
 left join public.otc_move_uom_evidence e
   on e.company_id=d.company_id and e.move_kind='delivery'
  and e.odoo_move_id=d.odoo_move_id
 where d.sale_order_line_id is not null and d.link_confidence='direct'
 group by d.company_id,d.sale_order_line_id,d.product_id
), rs as (
 select r.company_id,r.sale_order_line_id,r.product_id,
        count(*)::bigint total_count,
        count(e.odoo_move_id) filter (
          where e.evidence_status='verified'
            and e.quantity_semantics_verified
            and e.source_updated_at is not distinct from r.source_updated_at
            and e.product_id=r.product_id
            and e.sale_order_line_id=r.sale_order_line_id
            and e.origin_returned_move_id is not distinct from r.origin_returned_move_id
            and e.base_qty is not null
        )::bigint valid_count,
        sum(e.base_qty) filter(where e.evidence_status='verified') base_qty,
        min(e.base_uom_id) base_uom_min,max(e.base_uom_id) base_uom_max,
        min(e.uom_category_id) cat_min,max(e.uom_category_id) cat_max,
        array_agg(r.odoo_return_move_id order by r.odoo_return_move_id) return_move_ids
 from public.otc_return_lines r
 left join public.otc_move_uom_evidence e
   on e.company_id=r.company_id and e.move_kind='return'
  and e.odoo_move_id=r.odoo_return_move_id
 where r.sale_order_line_id is not null and r.link_confidence='direct'
 group by r.company_id,r.sale_order_line_id,r.product_id
)
select r.company_id,r.sale_order_line_id,r.product_id,
       r.return_move_ids,d.base_qty as delivered_base_qty,
       r.base_qty as returned_base_qty,d.base_uom_min as base_uom_id
from rs r join ds d using(company_id,sale_order_line_id,product_id)
where r.total_count=r.valid_count and d.total_count=d.valid_count
  and r.total_count>0 and d.total_count>0
  and r.base_uom_min=r.base_uom_max and d.base_uom_min=d.base_uom_max
  and r.cat_min=r.cat_max and d.cat_min=d.cat_max
  and r.base_uom_min=d.base_uom_min and r.cat_min=d.cat_min
  and r.base_qty>d.base_qty;

revoke all on public.otc_verified_excess_return_v1 from public,anon,authenticated;
grant select on public.otc_verified_excess_return_v1 to service_role;
comment on view public.otc_verified_excess_return_v1 is
'Only arithmetic candidates with complete, unchanged and individually verified Odoo 18 quantity/UoM evidence. NOT fraud proof.';
commit;
