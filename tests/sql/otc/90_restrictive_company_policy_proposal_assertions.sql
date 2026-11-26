-- Self-contained ephemeral regression only. ROLLBACK guarantees no persisted changes.
-- Reproduces a broad Customer360 authenticated SELECT policy, then tests a
-- restrictive company-scoped guard. Never connects to a live project.
begin;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function public.authorized_company_ids() to authenticated;
grant select on public.otc_delivery_lines,public.otc_return_lines,public.otc_invoice_lines to authenticated;
alter table public.otc_delivery_lines enable row level security;
alter table public.otc_return_lines enable row level security;
alter table public.otc_invoice_lines enable row level security;
create policy customer360_authenticated_read on public.otc_delivery_lines
 for select to authenticated using (auth.uid() is not null);
create policy customer360_authenticated_read on public.otc_return_lines
 for select to authenticated using (auth.uid() is not null);
create policy customer360_authenticated_read on public.otc_invoice_lines
 for select to authenticated using (auth.uid() is not null);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$
begin
 if not exists(select 1 from public.otc_delivery_lines where company_id=2)
 then raise exception 'Synthetic legacy unrestricted policy scenario missing';end if;
end $$;
reset role;

-- Restrictive policies COMBINE with the legacy permissive policy via AND.
create policy otc_company_scope_restrictive_read on public.otc_delivery_lines
 as restrictive for select to authenticated
 using (auth.uid() is not null and company_id in (select public.authorized_company_ids()));
create policy otc_company_scope_restrictive_read on public.otc_return_lines
 as restrictive for select to authenticated
 using (auth.uid() is not null and company_id in (select public.authorized_company_ids()));
create policy otc_company_scope_restrictive_read on public.otc_invoice_lines
 as restrictive for select to authenticated
 using (auth.uid() is not null and company_id in (select public.authorized_company_ids()));

set role authenticated;
do $$
begin
 if exists(select 1 from public.otc_delivery_lines where company_id=2)
 then raise exception 'Cross-company delivery still readable';end if;
 if exists(select 1 from public.otc_return_lines where company_id=2)
 then raise exception 'Cross-company return still readable';end if;
 if not exists(select 1 from public.otc_delivery_lines where company_id=1)
 then raise exception 'Authorized same-company delivery accidentally blocked';end if;
end $$;
reset role;

-- A signed-in user with no matching authorized-company scope reads no rows.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$
begin
 if exists(select 1 from public.otc_delivery_lines)
 or exists(select 1 from public.otc_return_lines)
 or exists(select 1 from public.otc_invoice_lines)
 then raise exception 'Unknown staff identity could read OTC data';end if;
end $$;
reset role;
rollback;
