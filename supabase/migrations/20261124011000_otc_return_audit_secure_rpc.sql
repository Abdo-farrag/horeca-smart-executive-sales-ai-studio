-- Issue #13: secure, paginated manager audit RPC. Read-only and provisional.
begin;
create or replace function public.analytics_return_audit_candidates_v1(
  p_company_id bigint default null,
  p_rule_code text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  rule_code text,
  company_id bigint,
  sale_order_line_id bigint,
  product_id bigint,
  return_move_ids bigint[],
  delivered_qty numeric,
  returned_qty numeric,
  confidence text,
  explanation text
)
language plpgsql stable security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or auth.role() is distinct from 'authenticated' then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;
  -- Unlinked moves may have no salesperson: reserve this V1 queue for active managers.
  -- Company scoping is mandatory even for managers.
  if not exists (
    select 1 from public.app_user_roles u
    where u.user_id=auth.uid() and u.is_active=true and u.role in ('manager','admin')
  ) then
    raise exception 'AUDIT_MANAGER_REQUIRED' using errcode='42501';
  end if;
  if p_company_id is not null and p_company_id not in (select public.authorized_company_ids()) then
    raise exception 'COMPANY_SCOPE_FORBIDDEN' using errcode='42501';
  end if;
  return query
  select a.rule_code,a.company_id,a.sale_order_line_id,a.product_id,
         a.return_move_ids,a.delivered_qty,a.returned_qty,a.confidence,a.explanation
  from public.otc_return_audit_candidates_v1 a
  where a.company_id in (select public.authorized_company_ids())
    and (p_company_id is null or a.company_id=p_company_id)
    and (p_rule_code is null or a.rule_code=p_rule_code)
  order by a.company_id,a.rule_code,a.sale_order_line_id nulls last,a.product_id,a.return_move_ids
  limit least(greatest(coalesce(p_limit,100),1),200)
  offset greatest(coalesce(p_offset,0),0);
end;
$$;
revoke all on function public.analytics_return_audit_candidates_v1(bigint,text,integer,integer) from public,anon,authenticated;
grant execute on function public.analytics_return_audit_candidates_v1(bigint,text,integer,integer) to authenticated;
commit;
