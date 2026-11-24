-- Isolated fixture compatibility for UoM gate; never applied to Production.
alter table public.otc_delivery_lines add column if not exists source_updated_at timestamptz;
alter table public.otc_return_lines add column if not exists source_updated_at timestamptz;
alter table public.otc_return_lines add column if not exists origin_returned_move_id bigint;

alter table public.otc_return_lines add column if not exists synced_at timestamptz not null default now();
