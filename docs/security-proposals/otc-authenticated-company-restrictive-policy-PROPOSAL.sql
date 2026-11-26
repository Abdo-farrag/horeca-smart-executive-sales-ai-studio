-- PROPOSED ONLY: not a migration or authorization for production deployment.
-- Restrictive RLS company guard for broad Customer360 authenticated SELECT policy.
-- Requires isolated staging approval, real JWT UAT and dependency audit BEFORE Production.
-- A restrictive policy combines with ALL existing permissive policies using AND.
-- Never replace the Company 360 policy here; preserve it while we validate access.
begin;
do $$
declare v_table text;
begin
  foreach v_table in array array['otc_delivery_lines','otc_return_lines','otc_invoice_lines'] loop
    if to_regclass('public.' || v_table) is null then
      raise exception 'Missing OTC table: %',v_table;
    end if;
    if not exists (select 1 from pg_policies
       where schemaname='public' and tablename=v_table
         and policyname='customer360_authenticated_read'
         and cmd='SELECT' and 'authenticated'=any(roles)) then
      raise exception 'Expected Customer360 SELECT policy missing on %',v_table;
    end if;
    if exists(select 1 from pg_policies where schemaname='public' and tablename=v_table
      and policyname='otc_company_scope_restrictive_read') then
      raise exception 'Company restrictive guard already exists on %',v_table;
    end if;
    execute format(
      'create policy otc_company_scope_restrictive_read on public.%I as restrictive for select to authenticated using (auth.uid() is not null and company_id in (select public.authorized_company_ids()))',
      v_table);
  end loop;
end;
$$;
-- Run staging assertions as signed-in manager, scoped salesperson, cross-company
-- salesperson, disabled profile and anonymous caller before approving commit.
commit;

-- ROLLBACK PLAN (separate approved transaction only):
-- begin;
-- drop policy if exists otc_company_scope_restrictive_read on public.otc_delivery_lines;
-- drop policy if exists otc_company_scope_restrictive_read on public.otc_return_lines;
-- drop policy if exists otc_company_scope_restrictive_read on public.otc_invoice_lines;
-- commit;

-- WARNING: rollback restores the broader previous exposure;
-- restrict Data API access first if a rollback is necessary.