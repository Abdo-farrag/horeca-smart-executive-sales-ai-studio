-- OTC performance patch: support salesperson resolution without changing business semantics.
begin;

create index if not exists idx_customer_product_history_order_salesperson
  on public.customer_product_history (order_id, salesperson_id)
  where order_id is not null;

create index if not exists idx_psfj_order_date_raw
  on public.product_sales_from_june1 (order_date);

analyze public.customer_product_history;
analyze public.product_sales_from_june1;

commit;
