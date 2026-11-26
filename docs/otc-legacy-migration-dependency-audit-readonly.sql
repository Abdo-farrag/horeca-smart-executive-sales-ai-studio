-- READ ONLY. Audit whether legacy migration statements reference public objects
-- before a recorded CREATE TABLE. The heuristic intentionally looks at TABLES
-- only; views, functions, sequences and unqualified names need separate review.
with migrations as (
 select version,name,lower(array_to_string(statements,E'\n')) as sql_body
 from supabase_migrations.schema_migrations
 where version<'20260721'
), references as (
 select m.version,m.name,(regexp_matches(m.sql_body,'public[.]([a-z_][a-z0-9_]*)','g'))[1] as object_name
 from migrations m
), first_refs as (
 select object_name,min(version) as first_used_in from references group by object_name
), creators as (
 select f.object_name,
 (select min(m.version) from migrations m where
  m.sql_body ~ ('create[[:space:]]+table[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?public[.]'
                 || f.object_name || '([^a-z0-9_]|$)')) as first_table_created_in
 from first_refs f
)
select f.object_name,f.first_used_in,c.first_table_created_in,
       to_regclass('public.'||f.object_name) is not null as exists_in_original_project
from first_refs f join creators c using(object_name)
where (c.first_table_created_in is null or c.first_table_created_in>f.first_used_in)
 and f.object_name in (
  'raw_products','manual_current_stock','purchase_recommendations',
  'sku_master','sku_supplier_settings','raw_sales_lines','customer_product_history'
 )
order by f.first_used_in,f.object_name;
