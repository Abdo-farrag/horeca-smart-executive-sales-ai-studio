-- Issue #13: read-only return UoM evidence coverage dashboard, no live data writes.
-- Each source move has exactly one exclusive diagnostic reason. This reports
-- evidence readiness; it does not assert stock wrongdoing or Odoo completeness.
begin;
create or replace view public.otc_return_evidence_status_v1
with (security_invoker=true) as
select
 r.company_id,r.odoo_return_move_id,r.sale_order_line_id,r.product_id,
 r.origin_returned_move_id,r.return_receipt_date,r.synced_at,
 case
  when r.link_confidence <> 'direct' or r.sale_order_line_id is null
    then 'UNVERIFIED_ORDER_LINK'
  when r.origin_returned_move_id is null or d.odoo_move_id is null
    then 'ORIGINAL_DELIVERY_NOT_IN_SNAPSHOT'
  when e.odoo_move_id is null or de.odoo_move_id is null
    then 'MISSING_UOM_EVIDENCE'
  when e.evidence_status <> 'verified' or de.evidence_status <> 'verified'
    or not e.quantity_semantics_verified or not de.quantity_semantics_verified
    or e.base_qty is null or de.base_qty is null
    then 'UOM_EVIDENCE_NOT_VERIFIED'
  when e.source_updated_at is distinct from r.source_updated_at
    or de.source_updated_at is distinct from d.source_updated_at
    or e.source_qty is distinct from r.returned_qty
    or de.source_qty is distinct from d.delivered_qty
    or e.product_id is distinct from r.product_id
    or de.product_id is distinct from d.product_id
    or e.sale_order_line_id is distinct from r.sale_order_line_id
    or de.sale_order_line_id is distinct from d.sale_order_line_id
    or e.origin_returned_move_id is distinct from r.origin_returned_move_id
    then 'STALE_OR_MISMATCHED_EVIDENCE'
  when e.base_uom_id is distinct from de.base_uom_id
    or e.uom_category_id is distinct from de.uom_category_id
    or e.uom_category_id is null or de.uom_category_id is null
    then 'INCOMPATIBLE_UOM'
  else 'EVIDENCE_READY'
 end::text as diagnostic_status
from public.otc_return_lines r
left join public.otc_delivery_lines d
 on d.odoo_move_id=r.origin_returned_move_id
 and d.company_id=r.company_id
 and d.product_id=r.product_id
 and d.sale_order_line_id=r.sale_order_line_id
 and d.link_confidence='direct'
left join public.otc_move_uom_evidence e
 on e.company_id=r.company_id and e.move_kind='return'
 and e.odoo_move_id=r.odoo_return_move_id
left join public.otc_move_uom_evidence de
 on de.company_id=d.company_id and de.move_kind='delivery'
 and de.odoo_move_id=d.odoo_move_id;
revoke all on public.otc_return_evidence_status_v1 from public,anon,authenticated;
grant select on public.otc_return_evidence_status_v1 to service_role;

create or replace function public.analytics_otc_return_evidence_coverage_v1(
 p_company_id bigint default null
)
returns table(
 company_id bigint, diagnostic_status text, movement_count bigint,
 latest_source_sync timestamptz
)
language plpgsql stable security definer
set search_path=public,auth
as $$
begin
 if auth.uid() is null or auth.role() is distinct from 'authenticated'
 then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from public.app_user_roles u
   where u.user_id=auth.uid() and u.is_active=true and u.role in ('manager','admin'))
 then raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501'; end if;
 if p_company_id is not null and p_company_id not in
   (select public.authorized_company_ids())
 then raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501'; end if;
 return query
 select v.company_id,v.diagnostic_status,count(*)::bigint,max(v.synced_at)
 from public.otc_return_evidence_status_v1 v
 where v.company_id in (select public.authorized_company_ids())
   and (p_company_id is null or v.company_id=p_company_id)
 group by v.company_id,v.diagnostic_status
 order by v.company_id,v.diagnostic_status;
end;
$$;
revoke all on function public.analytics_otc_return_evidence_coverage_v1(bigint)
 from public,anon,authenticated;
grant execute on function public.analytics_otc_return_evidence_coverage_v1(bigint)
 to authenticated;
comment on function public.analytics_otc_return_evidence_coverage_v1(bigint) is
'Manager-only coverage over the OTC return snapshot. Zero rows is not proof Odoo sync is complete.';
commit;
