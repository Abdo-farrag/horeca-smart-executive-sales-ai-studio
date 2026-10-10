-- Return pickup partner is NOT necessarily the original customer delivery address.
begin;
alter table public.otc_return_lines add column if not exists return_partner_id bigint;
create index if not exists idx_otc_return_pickup_partner on public.otc_return_lines(company_id,return_partner_id) where return_partner_id is not null;
commit;
