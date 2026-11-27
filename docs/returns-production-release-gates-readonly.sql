-- Metadata-only read-only release verification for Returns Intelligence.
-- REVIEW BEFORE RUNNING. Never executes writes or requests Odoo credentials.
-- Required objects: backend proposals are NOT installed in Production yet.
select p.proname as rpc_name
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'analytics_returns_cohort_dashboard_v1',
 'analytics_returns_cohort_order_detail_v1',
 'analytics_returns_cohort_order_cases_v1',
 'review_returns_cohort_order_case_v1',
 'analytics_returns_case_worklist_v1',
 'assign_returns_order_case_v1',
 'analytics_returns_case_assignees_v1',
 'analytics_returns_order_assignments_v1'
) order by rpc_name;

select c.relname as object_name,c.relkind,c.relrowsecurity,
 has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
 'otc_return_audit_case_order_links','otc_return_case_assignments',
 'otc_return_case_assignment_events','otc_delivery_lines',
 'otc_return_lines','otc_invoice_lines'
) order by c.relname;

select tablename,policyname,cmd,permissive,roles,qual
from pg_policies where schemaname='public'
 and tablename in ('otc_delivery_lines','otc_return_lines','otc_invoice_lines')
order by tablename,policyname;

-- Any authenticated source-table SELECT with no mandatory company constraint
-- is a release blocker. The query does not claim to have tested real JWTs.
